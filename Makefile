test_admin: build/template.minified.js.deployed
	open http://localhost:3000/admin

upload: build/template.minified.js.deployed

build/template.minified.js.deployed: build build/template.minified.js
	gsutil cp build/template.minified.js gs://admin-happycansnow-com/
	touch build/template.minified.js.deployed

build/template.minified.js: build template.js
	curl -X POST -s --data-urlencode 'input@template.js' https://javascript-minifier.com/raw > build/minifier.output
	if ( head -1 build/minifier.output | grep " Error " > /dev/null ) ; then cat build/minifier.output ; false ; else true ; fi
	mv build/minifier.output build/template.minified.js

build:
	mkdir -p build

clean:
	rm -rf build
