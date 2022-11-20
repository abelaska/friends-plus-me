package main

import (
  "os"
  "log"
  "fmt"
  "time"
	"net/http"
  "github.com/caarlos0/env"
)

type config struct {
  ImageProxyUrl      string        `env:"IMAGE_PROXY_URL" envDefault:"https://image-proxy-dot-fpm-application.appspot.com"`
  ImageProxyToken    string        `env:"IMAGE_PROXY_TOKEN",required`
  BucketName         string        `env:"BUCKET_NAME" envDefault:"fpm-user-assets"`
  ImageFetchTimeout  time.Duration `env:"IMAGE_FETCH_TIMEOUT" envDefault:"60s"`
  ImageUploadTimeout time.Duration `env:"IMAGE_UPLOAD_TIMEOUT" envDefault:"100s"`
  ClientToken        string        `env:"CLIENT_TOKEN,required"`
  Debug              bool          `env:"DEBUG" envDefault:"false"`
  MaxRequestSize     int           `env:"MAX_REQUEST_SIZE" envDefault:"65536"`
  Port               int           `env:"PORT" envDefault:"8080"`
  ServeSecuredUrls   bool          `env:"SERVE_SECURED_URLS" envDefault:"true"`
}

var (
  cfg = config{}
)

func main() {
  _ = env.Parse(&cfg)

  InitLog(os.Stderr, os.Stdout, os.Stdout, os.Stderr)

  webpInit()

  http.HandleFunc("/health", healthCheckHandler)
  http.HandleFunc("/fetch", fetchHandler)
  http.HandleFunc("/register", registerHandler())
  http.HandleFunc("/unregister", unregisterHandler())

  addr := fmt.Sprintf(":%v", cfg.Port)

  Info("Listening on address %v", addr)

  log.Fatal(http.ListenAndServe(addr, nil))
}
