package fpm

import (
  "fmt"
  "net/http"
  "github.com/julienschmidt/httprouter"
)

var appUrl = "https://app.friendsplus.me"

func init() {
  appProxy := NewSingleHostReverseProxy(appUrl)

  r := httprouter.New()
  r.GET("/premium", redirect("/pricing"))
  r.GET("/team", redirect("/about"))
  r.GET("/contact", redirect("/about"))
  r.GET("/help", redirect("http://help.friendsplus.me"))
  r.GET("/faq", redirect("http://help.friendsplus.me"))
  r.GET("/privacy", redirect("http://www.iubenda.com/privacy-policy/367858"))
  r.GET("/plus", redirect("https://plus.google.com/+FriendsPlusMe"))
  r.GET("/share", redirect("https://app.friendsplus.me/share"))
  r.GET("/partner/:partner", partnerRedirect)
  r.GET("/_ah/warmup", func (w http.ResponseWriter, r *http.Request, _ httprouter.Params) {})
  r.POST("/1/paypal/ipn/callback", reverseProxy(appProxy))
  r.POST("/1/braintree/webhooks", reverseProxy(appProxy))

  http.Handle("/", r)
}

func reverseProxy(proxy *ReverseProxy) httprouter.Handle {
  return func (w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
    proxy.ServeHTTP(w, r)
  }
}

func partnerRedirect(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
  url := appUrl
  partnerId := ps.ByName("partner")
  if partnerId != "" {
    url = fmt.Sprintf("%s/partner/%s", url, partnerId)
  }
  http.Redirect(w, r, url, http.StatusMovedPermanently)
}

func redirect(url string) httprouter.Handle {
  return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	  http.Redirect(w, r, url, http.StatusMovedPermanently)
  }
}
