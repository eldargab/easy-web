test:
	@mocha ./lib/*/test -R spec

test-http:
	@mocha ./lib/http/test

test-router:
	@mocha ./lib/router/test

test-app:
	@mocha ./lib/app/test

.PHONY: test test-http test-router test-app
