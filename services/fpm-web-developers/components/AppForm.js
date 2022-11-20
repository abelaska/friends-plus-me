import React from 'react';
import styled from 'styled-components';
import { Form } from 'mobx-react-form';
import validatorjs from 'validatorjs';
import { Col, Row } from 'react-styled-flexboxgrid';
import { observer, inject } from 'mobx-react';
import { isArrayOfUrls } from '../utils/validations';
import { CreateFilledButton, WaitingButton } from './Buttons';
import Avatar from './Avatar';

// https://github.com/foxhound87/mobx-react-form/issues/262
const uniqueId = store => field => {
  const key = field.path.replace(/\\./g, '-');
  store.counters = store.counters || {};
  store.counters[key] = (store.counters[key] || 0) + 1;
  return [key, '--', store.counters[key]].join('');
};

export class AppFormData extends Form {
  constructor({ app, store }) {
    super(
      {
        fields: [
          {
            name: 'name',
            label: 'app name',
            placeholder: 'SuperCoolApp',
            rules: 'required|string|between:2,25',
            value: app && app.name
          },
          {
            name: 'url',
            label: "app's homepage",
            placeholder: 'https://...',
            rules: 'required|url|string|between:0,200',
            value: app && app.url
          },
          {
            name: 'picture',
            label: "app's avatar URL",
            placeholder: 'https://.../avatar.jpg',
            rules: 'required|url|string|between:0,200',
            extra: {
              tip: 'The recommended avatar picture size is 50x50.'
            },
            value: app && app.picture
          },
          {
            name: 'description',
            label: 'short description',
            placeholder: 'My super useful Friends+Me application.',
            rules: 'required|string|between:0,140',
            extra: {
              tip: 'A free text description of the client. Max character count is 140.'
            },
            value: app && app.description
          },
          {
            name: 'callbacks',
            label: 'callback URLs',
            placeholder: 'https://..., http://...',
            rules: 'required|string|between:0,500',
            validators: [isArrayOfUrls],
            extra: {
              tip:
                'After the user authenticates we will only call back to any of these URLs. You can specify multiple valid URLs by comma-separating them (typically to handle different environments like QA or testing). Make sure to specify the protocol, http:// or https://, otherwise the callback may fail in some cases.'
            },
            value: app && app.callbacks && app.callbacks.join(', ')
          }
        ]
      },
      {
        plugins: { dvr: validatorjs },
        options: { uniqueId: uniqueId(store.ui) },
        hooks: {
          onSuccess(form) {
            const { createApp, updateApp } = store.ui;
            if (app) {
              const { app_id } = app;
              const updatedApp = form.values();
              updateApp({ ...updatedApp, app_id })
                .then(() => {})
                .catch(error => {
                  // TODO show error
                  console.log('failed to update app', error);
                });
            } else {
              const newApp = form.values();
              createApp(newApp)
                .then(() => {})
                .catch(error => {
                  // TODO show error
                  console.log('failed to create app', error);
                });
            }
          }
        }
      }
    );
    this.isAppUpdate = !!app;
  }
}

const Label = styled(Col)`
  text-align: left;
  margin-right: 10px;
  margin-bottom: 5px;
  font-size: 16px;
  font-weight: 500;
  text-transform: capitalize;
`;

const Textarea = styled.textarea`
  resize: none;
  width: calc(100% - 20px);
  min-width: 200px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.4);
  padding: 10px;
  font-size: 14px;
`;

const Input = styled.input`
  resize: none;
  width: calc(100% - 20px);
  min-width: 200px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.4);
  padding: 10px;
  font-size: 14px;
`;

const Line = styled(Col)`margin-bottom: 30px;`;

const Value = styled(Col)`
  text-align: left;

  small {
    font-size: 13px;
    color: rgba(0, 0, 0, 0.6);
  }
`;

const AvatarCol = styled(Col)`
  border-radius: 0.3em;
  margin-left: 20px;
  width: 50px;
  height: 50px;
`;

const Error = styled.p`color: rgba(255, 0, 0, 0.75);`;

@inject('store')
@observer
class AppForm extends React.Component {
  render() {
    const { form, isNew, isUpdate, store: { ui: { appCreating, appUpdating } } } = this.props;

    const tip = fieldName =>
      (form.$(fieldName).extra && form.$(fieldName).extra.tip ? <small>{form.$(fieldName).extra.tip}</small> : null);

    const error = fieldName => <Error>{form.$(fieldName).error}</Error>;

    const picture = form && form.$('picture').isValid && form.$('picture').value;

    return (
      <Col xs={11} sm={8} md={6}>
        <Line start="xs" middle="xs">
          <Label xs={true}>{form.$('name').label}</Label>
          <Value xs={true}>
            <Input {...form.$('name').bind()} />
            {error('name')}
            {tip('name')}
          </Value>
        </Line>
        <Line start="xs" middle="xs">
          <Label xs={true}>{form.$('url').label}</Label>
          <Value xs={true}>
            <Input {...form.$('url').bind()} />
            {error('url')}
            {tip('url')}
          </Value>
        </Line>
        <Line start="xs" middle="xs">
          <Label xs={true}>{form.$('picture').label}</Label>
          <Row xs={true}>
            <Value xs={true}>
              <Input {...form.$('picture').bind()} />
              {error('picture')}
              {tip('picture')}
            </Value>
            {picture && (
              <AvatarCol>
                <Avatar src={picture} />
              </AvatarCol>
            )}
          </Row>
        </Line>
        <Line start="xs">
          <Label xs={true}>{form.$('description').label}</Label>
          <Value xs={true}>
            <Textarea {...form.$('description').bind()} />
            {error('description')}
            {tip('description')}
          </Value>
        </Line>
        <Line start="xs">
          <Label xs={true}>{form.$('callbacks').label}</Label>
          <Value xs={true}>
            <Textarea {...form.$('callbacks').bind()} />
            {error('callbacks')}
            {tip('callbacks')}
          </Value>
        </Line>
        <WaitingButton
          Button={CreateFilledButton}
          onClick={!appCreating && !appUpdating && form.onSubmit}
          waiting={appCreating || appUpdating}
          color="#54b8df"
          text={form.isAppUpdate ? 'Update Application' : 'Create Application'}
        />
      </Col>
    );
  }
}

export default AppForm;
