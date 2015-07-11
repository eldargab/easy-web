test:
	@./node_modules/.bin/mocha

bench:
	@./bench/run

.PHONY: test bench
