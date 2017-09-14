/* eslint-disable no-nested-ternary */
/*
  FormGroup that contains a FormControl for which:
    - if there is a value, displays a label
    - if there is no value, put the label in the placeholder
 */
import React from 'react';
import { ControlLabel, FormGroup, FormControl, HelpBlock } from 'react-bootstrap';
import { I18n } from 'react-redux-i18n';

import RichTextEditor from './richTextEditor';

class FormControlWithLabel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      errorMessage: '',
      validationState: null
    };
    this.setValidationState = this.setValidationState.bind(this);
  }

  setValidationState() {
    let errorMessage = '';
    let validationState = null;
    if (this.props.required && this.props.value.length === 0) {
      errorMessage = I18n.t('error.required');
      validationState = 'error';
    }

    this.setState({ errorMessage: errorMessage, validationState: validationState });
  }

  renderRichTextEditor = () => {
    const { label, onChange, value } = this.props;
    return (
      <RichTextEditor
        rawContentState={value}
        placeholder={label}
        toolbarPosition="bottom"
        updateContentState={(cs) => {
          return onChange(cs);
        }}
        withAttachmentButton={false}
      />
    );
  };

  renderFormControl = () => {
    const { type, value } = this.props;
    if (type === 'rich-text') {
      return this.renderRichTextEditor();
    }
    return (
      <FormControl
        componentClass={this.props.componentClass}
        id={this.props.id}
        type={type}
        placeholder={this.props.label}
        onChange={this.props.onChange}
        value={value || ''}
        onBlur={this.setValidationState}
      />
    );
  };

  valueIsEmpty = () => {
    const { type, value } = this.props;
    if (!value) {
      return true;
    }

    if (type === 'rich-text') {
      const allText = value.blocks
        .map((b) => {
          return b.text;
        })
        .reduce((a, b) => {
          return a + b;
        }, '');
      return allText.length === 0;
    }

    return value.length === 0;
  };

  render() {
    const { id, label, labelAlwaysVisible } = this.props;
    const displayLabel = labelAlwaysVisible || !this.valueIsEmpty();
    return (
      <FormGroup validationState={this.state.validationState}>
        {displayLabel
          ? <ControlLabel htmlFor={id}>
            {label}
          </ControlLabel>
          : null}
        {this.renderFormControl()}
        {this.state.errorMessage
          ? <HelpBlock>
            {this.state.errorMessage}
          </HelpBlock>
          : null}
      </FormGroup>
    );
  }
}

FormControlWithLabel.defaultProps = {
  labelAlwaysVisible: false,
  type: 'text',
  value: undefined
};

export default FormControlWithLabel;