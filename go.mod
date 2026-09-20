// Present only for the OPT-IN calque codegen tier (packages/interfaces/calque).
//
// calque's generator is a Go program, not an npm package, so `pnpm
// gen:proto:calque` needs Go on PATH. Nothing else in this repo does — the
// default `pnpm gen:proto` path is pure TypeScript.
//
// Pinned rather than `@latest`: a regeneration has to produce the same output
// tomorrow as it did today.
module github.com/heojeongbo/ui-app-template

go 1.26.3

tool github.com/heojeongbo/calque

require (
	github.com/goccy/go-yaml v1.19.2 // indirect
	github.com/heojeongbo/calque v0.7.2 // indirect
	github.com/lesomnus/xli v0.0.0-20260717171524-bf8cac633057 // indirect
	github.com/lesomnus/z v0.0.0-20260531102454-3f1853bb4278 // indirect
	golang.org/x/exp v0.0.0-20241217172543-b2144cdd0a67 // indirect
	google.golang.org/protobuf v1.36.11 // indirect
)
