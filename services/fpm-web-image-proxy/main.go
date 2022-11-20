package main

import (
  "time"
	"net/http"
  "github.com/caarlos0/env"
  "google.golang.org/appengine"
)

type config struct {
  BucketName         string        `env:"BUCKET_NAME" envDefault:"fpm-user-assets"`
  ImageFetchTimeout  time.Duration `env:"IMAGE_FETCH_TIMEOUT" envDefault:"60s"`
  ImageUploadTimeout time.Duration `env:"IMAGE_UPLOAD_TIMEOUT" envDefault:"60s"`
  ClientToken        string        `env:"CLIENT_TOKEN,required"`
  Debug              bool          `env:"DEBUG" envDefault:"false"`
  MaxRequestSize     int           `env:"MAX_REQUEST_SIZE" envDefault:"65536"`
  ServeSecuredUrls   bool          `env:"SERVE_SECURED_URLS" envDefault:"true"`
}

var (
  cfg = config{}
)

func main() {
  _ = env.Parse(&cfg)

	http.HandleFunc("/_ah/health", healthCheckHandler)
	http.HandleFunc("/register", registerHandler)

  appengine.Main()
}
