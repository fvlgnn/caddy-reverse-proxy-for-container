FROM golang:1.23.1-alpine AS builder

WORKDIR /src

# go-mock-api-server does not publish versioned images yet. Pinning the Git
# commit keeps this build reproducible until a tagged image is available.
ADD https://github.com/fvlgnn/go-mock-api-server.git#7585fa1e44cb4cc985d88fcd9f6bed8ea502ff09 /src

RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /go-mock-api-server .

FROM scratch

COPY --from=builder /go-mock-api-server /go-mock-api-server
COPY *.json /config/

USER 65532:65532
EXPOSE 8080

ENTRYPOINT ["/go-mock-api-server"]
