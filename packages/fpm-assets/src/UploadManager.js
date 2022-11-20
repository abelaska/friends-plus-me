// @flow
import uuid from 'uuid';
import config from '@fpm/config';
import Storage from '@google-cloud/storage';

export type FileUploadUrl = {|
  url: string,
  contentType?: string,
  filename: string,
  uploadUrl: string
|};

export type CreateFileUploadUrl = {|
  contentType?: string
|};

export type CreateFileUploadUrlInput = {|
  input: CreateFileUploadUrl
|};

export type CreateFileUploadUrlOutput = {|
  file: FileUploadUrl
|};

let _storage;

const storage = () => {
  const { projectId, credentials } = config.get('image:upload');
  if (!_storage) {
    _storage = new Storage({ projectId, credentials });
  }
  return _storage;
};

const contentTypeToExt = {
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/png': '.png'
};

const createFilename = ({ user, contentType }: Object): string => {
  const suffix = (contentType && contentTypeToExt[contentType]) || '';
  const prefix = (user && user._id && `${user._id.toString().replace(/-/g, '')}/`) || 'anonymous/';
  const name = uuid
    .v4()
    .toString()
    .replace(/-/g, '');
  return `${prefix}${name}${suffix}`;
};

const createUploadUrl = async ({ filename, contentType }: Object): Promise<string> => {
  return new Promise((resolve, reject) => {
    storage()
      .bucket(config.get('image:upload:bucket'))
      .file(filename)
      .getSignedUrl(
        {
          action: 'write',
          contentType,
          expires: Date.now() + config.get('image:upload:uploadUrlTTL')
        },
        (err, uploadUrl) => {
          if (err) {
            return reject(err);
          }
          return resolve(uploadUrl);
        }
      );
  });
};

export const createUserFileUploadUrl = async ({ user, contentType }: Object = {}): Promise<FileUploadUrl> => {
  const filename = createFilename({ user, contentType });
  const url = `https://storage.googleapis.com/${config.get('image:upload:bucket')}/${filename}`;
  const uploadUrl = await createUploadUrl({ filename, contentType });
  const result: FileUploadUrl = { url, filename, uploadUrl, contentType };
  return result;
};
