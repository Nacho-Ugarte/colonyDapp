/* @flow */

import type { HOC } from 'recompose';
import type { IntlShape, MessageDescriptor } from 'react-intl';
import type { ComponentType } from 'react';

import React from 'react';
import { Field, getIn } from 'formik';
import { injectIntl } from 'react-intl';
import compose from 'recompose/compose';
import mapProps from 'recompose/mapProps';

type FormatMessage = (
  messageDescriptor: MessageDescriptor,
  values?: Object,
) => string;

type CommonProps = {
  appearance?: Object,
  label?: MessageDescriptor | string,
  name: string,
  placeholder?: MessageDescriptor | string,
  title?: MessageDescriptor | string,
};

type InProps = CommonProps & {
  connect?: boolean,
  id?: string,
  intl: IntlShape,
  form: {
    touched: Object,
    errors: Object,
    setFieldValue: (
      field: string,
      value: any,
      shouldValidate?: boolean,
    ) => void,
    setFieldError: (field: string, value: string) => void,
  },
  field: {
    name: string,
    value?: string,
    onChange: Function,
    onBlur: Function,
  },
};

type OutProps = CommonProps & {
  $error?: string,
  $value?: string,
  $touched?: boolean,
};

const formatIntl = (
  text?: MessageDescriptor | string,
  formatMessage: FormatMessage,
  textValues?: { [string]: string },
): string => {
  if (!text) {
    return '';
  }
  if (typeof text == 'string') {
    return text;
  }
  return formatMessage(text, textValues);
};

const connectFormik = ({ alwaysConnected, validate }) => (
  FieldComponent: ComponentType<Object>,
) => ({ connect = true, ...props }: InProps) =>
  connect || alwaysConnected
    ? React.createElement(Field, {
        component: FieldComponent,
        validate,
        ...props,
      })
    : React.createElement(FieldComponent, props);

const asField = ({ alwaysConnected, validate }: Object = {}) => {
  const enhance: HOC<*, OutProps> = compose(
    injectIntl,
    connectFormik({ alwaysConnected, validate }),
    mapProps(
      ({
        id,
        intl: { formatMessage },
        field: { name: fieldName, value, onChange, onBlur } = {},
        form: { touched, errors, setFieldValue, setFieldError } = {},
        label,
        name,
        placeholder,
        title,
        ...props
      }: InProps) => {
        const htmlFieldName = fieldName || name;
        const $touched = getIn(touched, htmlFieldName);
        const fieldError = getIn(errors, htmlFieldName);
        const $error = fieldError && formatIntl(fieldError, formatMessage);
        const $id = id || htmlFieldName;
        const $title = formatIntl(title, formatMessage);
        const $label = formatIntl(label, formatMessage);
        const $placeholder = formatIntl(placeholder, formatMessage);
        // This is assigning an empty string to the field's value.
        // It might be problematic for some cases but for now I couldn't think of one
        const $value = value || '';
        return {
          'aria-label': label || $title,
          label: $label || $title,
          name: htmlFieldName || id,
          placeholder: $placeholder,
          title: $error || $title || $label || $placeholder,
          $id,
          $error,
          $value,
          $touched,
          onChange,
          onBlur,
          // TODO create util object for the following items
          formatIntl: (
            text?: string | MessageDescriptor,
            textValues?: { [string]: string },
          ): string => formatIntl(text, formatMessage, textValues),
          setError: (errorMessage: string) =>
            setFieldError(htmlFieldName, errorMessage),
          setValue: (val: any) => setFieldValue(htmlFieldName, val),
          ...props,
        };
      },
    ),
  );
  return enhance;
};

export default asField;
