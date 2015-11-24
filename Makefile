TOP = Mediathread.safariextension

test: node_modules
	npm test

jshint: node_modules/jshint/bin/jshint
	./node_modules/jshint/bin/jshint $(TOP)/src/*.js $(TOP)/injected/*.js

jscs: node_modules/jscs/bin/jscs
	./node_modules/jscs/bin/jscs $(TOP)/src/*.js $(TOP)/injected/*.js

node_modules:
	npm install

node_modules/jshint/bin/jshint:
	npm install jshint --prefix .

node_modules/jscs/bin/jscs:
	npm install jscs --prefix .

clean:
	rm -rf node_modules
