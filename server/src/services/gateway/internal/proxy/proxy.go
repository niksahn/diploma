package proxy

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"
)

type Route struct {
	Prefix       string
	Target       string
	SkipAuth     bool
	StripPrefix  bool
	AllowedWS    bool
	OverridePath string
}

func NewReverseProxy(target string, stripPrefix bool) http.Handler {
	targetURL, err := url.Parse(target)
	if err != nil {
		panic(err)
	}

	proxy := httputil.NewSingleHostReverseProxy(targetURL)

	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		req.Host = targetURL.Host

		if stripPrefix {
			req.URL.Path = ensureLeadingSlash(strings.TrimPrefix(req.URL.Path, strings.TrimSuffix(targetURL.Path, "/")))
		}
	}

	// Drop upstream CORS headers to avoid duplicates; CORS middleware will set correct values.
	proxy.ModifyResponse = func(resp *http.Response) error {
		resp.Header.Del("Access-Control-Allow-Origin")
		resp.Header.Del("Access-Control-Allow-Headers")
		resp.Header.Del("Access-Control-Allow-Methods")
		resp.Header.Del("Access-Control-Allow-Credentials")
		resp.Header.Del("Access-Control-Expose-Headers")
		return nil
	}

	proxy.ErrorLog = log.Default()
	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		log.Printf("proxy error for %s: %v", r.URL.Path, err)
		http.Error(w, "upstream unavailable", http.StatusBadGateway)
	}

	// Flush more often for streaming / websockets upgrade
	proxy.FlushInterval = 50 * time.Millisecond

	return proxy
}

func ensureLeadingSlash(path string) string {
	if strings.HasPrefix(path, "/") {
		return path
	}
	return "/" + path
}
