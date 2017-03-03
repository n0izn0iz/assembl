import json
from pyramid.events import NewRequest
from pyramid.view import view_config

from assembl.indexing.utils import connect
from assembl.indexing.settings import get_index_settings
from assembl.indexing.changes import changes, in_tests
from assembl import models
from assembl.lib.sqla import get_session_maker

def get_curl_query(query):
    return "curl -XGET 'localhost:9200/_search?pretty' -d '{}'".format(
        json.dumps(query).replace("'", "\\u0027"))


@view_config(route_name='search', renderer='json')
def search_endpoint(context, request):
    es = connect()
    index_name = get_index_settings()['index_name']
    query = request.json_body
#    print get_curl_query(query)
    result = es.search(index=index_name, body=query)

    # add creator_name in each hit
    creator_ids = set([hit['_source']['creator_id']
                       for hit in result['hits']['hits']
                       if hit['_source'].get('creator_id', None) is not None])
    session = get_session_maker()
    creators = session.query(models.AgentProfile.id, models.AgentProfile.name
        ).filter(models.AgentProfile.id.in_(creator_ids)).all()
    creators_by_id = dict(creators)
    # u'query': {u'bool': {u'filter': [{u'term': {u'discussion_id': u'23'}}]}}
    filters = [fil for fil in query['query']['bool']['filter']]
    discussion_id = [f.values()[0].values()[0]
                     for f in filters if 'discussion_id' in f.values()[0].keys()][0]
    for hit in result['hits']['hits']:
        source = hit['_source']
        creator_id = source.get('creator_id', None)
        if creator_id is not None:
            source['creator_name'] = creators_by_id.get(creator_id)

        if hit['_type'] == 'idea':
            idea = models.Idea.get_instance(source['id'])
            source['num_posts'] = idea.num_posts
            source['num_contributors'] = idea.num_contributors
        elif hit['_type'] == 'user':
            source['num_posts'] = models.AgentProfile.get_instance(source['id']).count_posts_in_discussion(discussion_id)

    return result


def join_transaction(event):
    if not in_tests():
        changes._join()



def includeme(config):
    config.add_route('search', '/_search')
    # join ElasticChanges datamanager to the transaction at the beginning
    # of the request to avoid joining when the status is Committing
    config.add_subscriber(join_transaction, NewRequest)
