kubectl apply -f mongodb-storage.yaml
kubectl apply -f mongodb.yaml

kubectl port-forward service/database 27017:27017