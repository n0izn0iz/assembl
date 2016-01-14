from collections import defaultdict

from celery import Celery

from pyramid.path import DottedNameResolver

from . import init_task_config, config_celery_app

# broker specified
translation_celery_app = Celery('celery_tasks.translate')

resolver = DottedNameResolver(__package__)

_services = {}


def get_service_of_discussion(discussion):
    global _services
    service = discussion.preferences["translation_service"]
    if not service:
        return
    if service not in _services:
        cls = resolver.resolve(service)
        _services[service] = cls()
    return _services[service]


def lang_list_as_translation_table(service, language_list):
    base_languages = {service.asKnownLocale(lang) for lang in languages}
    return {lang: base_languages - set(lang) for lang in base_languages}


def user_pref_as_translation_table(user, service):
    table = defaultdict(set)
    for pref in user.language_preference:
        if pref.translate_to:
            table[service.asKnownLocale(pref.locale.locale)].add(
                service.asKnownLocale(pref.translate_to_locale.locale))
    return table


def complete_lang_and_trans_table(
        service, discussion, translation_table, languages=None):
    if not translation_table:
        languages = languages or discussion.discussion_locales
        base_languages = {service.asKnownLocale(lang) for lang in languages}
        translation_table = {
            lang: base_languages - set(lang) for lang in base_languages}
    if not languages:
        languages = set()
        for targets in translation_table.itervalues():
            languages.update(targets)
    return translation_table, languages


def translate_content(
        content, translation_table=None, service=None, languages=None,
        send_to_changes=False):
    from ..models import Locale
    discussion = content.discussion
    service = service or get_service_of_discussion(discussion)
    if not service:
        return
    translation_table, languages = complete_lang_and_trans_table(
        service, discussion, translation_table, languages)
    undefined_id = Locale.UNDEFINED_LOCALEID
    changed = False
    # Special case: Short strings.
    und_subject = content.subject.undefined_entry
    und_body = content.body.undefined_entry
    if ((und_subject and not service.can_guess_locale(und_subject.value)) or
            (und_body and not service.can_guess_locale(und_body.value))):
        combined = " ".join((
            und_subject.value or next(iter(content.subject.non_mt_entries())).value,
            und_body.value or next(iter(content.body.non_mt_entries())).value))
        language, _ = service.identify(combined, languages)
        if und_subject:
            und_subject.locale_name = language
            content.db.expire(und_subject, ("locale",))
            content.db.expire(content.subject, ("entries_as_dict",))
        if und_body:
            und_body.locale_name = language
            content.db.expire(und_body, ("locale",))
            content.db.expire(content.body, ("entries_as_dict",))

    for prop in ("body", "subject"):
        ls = getattr(content, prop)
        if ls:
            entries = ls.entries_as_dict
            if undefined_id in entries:
                entry = entries[undefined_id]
                if entry.value:
                    # assume can_guess_locale = true
                    service.confirm_locale(entry, languages)
                    # reload entries
                    ls.db.expire(ls, ("entries_as_dict",))
                    entries = ls.entries_as_dict
            known = {service.asKnownLocale(
                        Locale.extract_source_locale(
                            Locale.locale_collection_byid[loc_id]))
                     for loc_id in entries}
            originals = ls.non_mt_entries()
            # pick randomly. TODO: Recency order?
            for original in originals:
                source_loc = service.asKnownLocale(original.locale_name)
                for dest in translation_table.get(source_loc, languages):
                    if dest not in known:
                        service.translate_lse(
                            original, Locale.get_or_create(dest))
                        ls.db.expire(ls, ["entries", "entries_as_dict"])
                        known.add(dest)
                        changed = True
    if changed and send_to_changes:
        content.send_to_changes()
    return changed


@translation_celery_app.task(ignore_result=True)
def translate_content_task(content_id):
    init_task_config(translation_celery_app)
    from ..models import Content
    content = Content.get(content_id)
    translate_content(content)


@translation_celery_app.task(ignore_result=True)
def translate_discussion(
        discussion_id, translation_table=None, languages=None,
        send_to_changes=False):
    from ..models import Discussion
    discussion = Discussion.get(discussion_id)
    service = get_service_of_discussion(discussion)
    if not service:
        return
    translation_table, languages = complete_lang_and_trans_table(
        service, discussion, translation_table, languages)
    changed = False
    for post in discussion.posts:
        changed |= translate_content(
            post, translation_table, service, languages, send_to_changes)
    return changed


def includeme(config):
    config_celery_app(translation_celery_app, config.registry.settings)