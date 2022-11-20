# create ip address for ingress
gcloud compute addresses create fpm-address --global
gcloud compute addresses describe fpm-address --global

# https://cloud.google.com/kubernetes-engine/docs/how-to/managed-certs

kubectl apply -f ingress.yaml
kubectl get ing
kubectl describe ing
gcloud compute ssl-certificates list --global

# Migrate domains

gcloud --project=friendspme dns record-sets export -z loysoft-com loysoft-com.yaml
gcloud --project=friendspme dns record-sets export -z friendsplus-me friendsplus-me.yaml

gcloud dns managed-zones create --dns-name="loysoft.com" --description="loysoft.com zone" loysoft-com
gcloud dns managed-zones create --dns-name="friendsplus.me" --description="friendsplus.me zone" friendsplus-me

gcloud dns record-sets import loysoft-com.yaml -z loysoft-com --delete-all-existing
gcloud dns record-sets import friendsplus-me.yaml -z friendsplus-me --delete-all-existing

gcloud dns managed-zones describe loysoft-com
dig loysoft.com @ns-cloud-d1.googledomains.com
dig +short NS loysoft.com

gcloud dns managed-zones describe friendsplus-me
dig friendsplus.me @ns-cloud-e1.googledomains.com
dig +short NS friendsplus.me

dig +short kube-lb.friendsplus.me