import React from 'react';
import { Translate } from 'react-redux-i18n';
import { compose, graphql } from 'react-apollo';
import { Row, Col } from 'react-bootstrap';

import { getDomElementOffset } from '../../../utils/globalFunctions';
import ProfileLine from '../../common/profileLine';
import PostTranslate from '../common/postTranslate';
import PostActions from './postActions';
import AnswerForm from './answerForm';
import EditPostForm from './editPostForm';
import DeletedPost from './deletedPost';
import PostQuery from '../../../graphql/PostQuery.graphql';
import withLoadingIndicator from '../../../components/common/withLoadingIndicator';
import { DeletedPublicationStates, PublicationStates } from '../../../constants';
import Nuggets from './nuggets';

export const PostFolded = ({ nbPosts }) => {
  return <Translate value="debate.thread.foldedPostLink" count={nbPosts} />;
};

const getFullLevelString = (fullLevel) => {
  return (
    fullLevel &&
    <span className="subject-prefix">
      {`Rep. ${fullLevel
        .map((level) => {
          return `${level + 1}`;
        })
        .join('.')}: `}
    </span>
  );
};

// TODO we need a graphql query to retrieve all languages with native translation, see Python langstrings.LocaleLabel
// We only have french and english for en, fr, ja for now.

class Post extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      showAnswerForm: false,
      mode: 'view',
      showOriginal: false
    };
  }

  componentDidMount() {
    this.props.measureTreeHeight(400);
  }

  componentDidUpdate(prevProps) {
    if (this.props.lang !== prevProps.lang || this.props.data.post.publicationState !== prevProps.data.post.publicationState) {
      this.props.measureTreeHeight(200);
    }
  }

  handleAnswerClick = () => {
    this.setState({ showAnswerForm: true }, this.props.measureTreeHeight);
    setTimeout(() => {
      if (!this.answerTextarea) return;
      const txtareaOffset = getDomElementOffset(this.answerTextarea).top;
      window.scrollTo({ top: txtareaOffset - this.answerTextarea.clientHeight, left: 0, behavior: 'smooth' });
    }, 200);
  };

  hideAnswerForm = () => {
    this.setState({ showAnswerForm: false }, this.props.measureTreeHeight);
  };

  handleEditClick = () => {
    this.setState({ mode: 'edit' }, this.props.measureTreeHeight);
  };

  goBackToViewMode = () => {
    this.setState({ mode: 'view' }, this.props.measureTreeHeight);
  };

  render() {
    const {
      id,
      subjectEntries,
      bodyEntries,
      bodyMimeType,
      indirectIdeaContentLinks,
      creator,
      modificationDate,
      sentimentCounts,
      mySentiment,
      publicationState,
      extracts
    } = this.props.data.post;
    const { lang, ideaId, refetchIdea, creationDate, fullLevel, numChildren, rowIndex } = this.props;
    // creationDate is retrieved by IdeaWithPosts query, not PostQuery
    let body;
    let subject;
    let originalBodyLocale;
    let originalBody;
    let originalSubject;
    if (bodyEntries.length > 1) {
      // first entry is the translated version, example localeCode "fr-x-mtfrom-en"
      // second entry is the original, example localeCode "en"
      body = this.state.showOriginal ? bodyEntries[1].value : bodyEntries[0].value;
      originalBodyLocale = bodyEntries[1].localeCode;
      originalBody = bodyEntries[1].value;
    } else {
      // translation is not enabled or the message is already in the desired locale
      body = bodyEntries[0].value;
      originalBody = bodyEntries[0].value;
    }
    if (subjectEntries.length > 1) {
      subject = this.state.showOriginal ? subjectEntries[1].value : subjectEntries[0].value;
      originalSubject = subjectEntries[1].value;
    } else {
      subject = subjectEntries[0].value;
      originalSubject = subjectEntries[0].value;
    }

    const modifiedSubject = (
      <span>
        {getFullLevelString(fullLevel)}
        {subject.replace('Re: ', '')}
      </span>
    );
    const modifiedOriginalSubject = (
      <span>
        {getFullLevelString(fullLevel)}
        {originalSubject.replace('Re: ', '')}
      </span>
    );
    if (publicationState in DeletedPublicationStates) {
      return (
        <DeletedPost
          id={id}
          subject={modifiedSubject}
          deletedBy={publicationState === PublicationStates.DELETED_BY_USER ? 'user' : 'admin'}
        />
      );
    }

    if (this.state.mode === 'edit') {
      return (
        <div className="posts">
          <div className="answer-form" id={id}>
            <EditPostForm
              id={id}
              body={originalBody}
              subject={originalSubject}
              refetchIdea={refetchIdea}
              goBackToViewMode={this.goBackToViewMode}
              readOnly={!!this.props.parentId}
              modifiedOriginalSubject={modifiedOriginalSubject}
            />
          </div>
        </div>
      );
    }

    const answerTextareaRef = (el) => {
      this.answerTextarea = el;
    };
    return (
      <div className="posts" id={id}>
        {Array.isArray(extracts) &&
          extracts.length > 0 &&
          <Nuggets extracts={extracts} fullLevel={fullLevel} rowIndex={rowIndex} postId={id} />}
        <div className="box">
          <Row className="post-row">
            <Col xs={12} md={11} className="post-left">
              {creator &&
                <ProfileLine
                  userId={creator.userId}
                  userName={creator.name}
                  creationDate={creationDate}
                  locale={lang}
                  modified={modificationDate !== null}
                />}
              {originalBodyLocale
                ? <PostTranslate
                  id={id}
                  showOriginal={this.state.showOriginal}
                  originalBodyLocale={originalBodyLocale}
                  toggle={() => {
                    return this.setState((state) => {
                      return { showOriginal: !state.showOriginal };
                    });
                  }}
                />
                : null}
              <h3 className="dark-title-3">
                {modifiedSubject}
              </h3>

              <div
                className={`body ${bodyMimeType === 'text/plain' ? 'pre-wrap' : ''}`}
                dangerouslySetInnerHTML={{ __html: body }}
              />
              {indirectIdeaContentLinks.length
                ? <div className="link-idea">
                  <div className="label">
                    <Translate value="debate.thread.linkIdea" />
                  </div>
                  <div className="badges">
                    {indirectIdeaContentLinks.map((link) => {
                      return (
                        <span className="badge" key={link.idea.id}>
                          {link.idea.title}
                        </span>
                      );
                    })}
                  </div>
                </div>
                : null}
              <div className="answers annotation">
                <Translate value="debate.thread.numberOfResponses" count={numChildren} />
              </div>
            </Col>
            <Col xs={12} md={1} className="post-right">
              <PostActions
                creatorUserId={creator.userId}
                postId={id}
                handleAnswerClick={this.handleAnswerClick}
                handleEditClick={this.handleEditClick}
                sentimentCounts={sentimentCounts}
                mySentiment={mySentiment}
                numChildren={numChildren}
              />
            </Col>
          </Row>
        </div>
        {this.state.showAnswerForm
          ? <div className="answer-form">
            <AnswerForm
              parentId={id}
              ideaId={ideaId}
              refetchIdea={refetchIdea}
              textareaRef={answerTextareaRef}
              hideAnswerForm={this.hideAnswerForm}
            />
          </div>
          : null}
      </div>
    );
  }
}

export default compose(graphql(PostQuery), withLoadingIndicator())(Post);