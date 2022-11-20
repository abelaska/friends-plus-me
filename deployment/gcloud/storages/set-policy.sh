gsutil lifecycle set draft-user-assets-upload.lifecycle.json gs://draft-user-assets-upload
gsutil cors set draft-user-assets-upload.cors.json gs://draft-user-assets-upload
gsutil defacl ch -u AllUsers:R gs://draft-user-assets-upload
gsutil defacl ch -u AllUsers:R gs://draft-user-assets

gsutil lifecycle set fpm-user-assets-upload.lifecycle.json gs://fpm-user-assets-upload
gsutil cors set fpm-user-assets-upload.cors.json gs://fpm-user-assets-upload
gsutil defacl ch -u AllUsers:R gs://fpm-user-assets-upload
gsutil defacl ch -u AllUsers:R gs://fpm-user-assets

gsutil cors set fpm-desktop.cors.json gs://fpm-desktop
gsutil defacl ch -u AllUsers:R gs://fpm-desktop