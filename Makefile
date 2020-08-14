test_admin: build/form.html.deployed build/template.minified.js.deployed
	open http://localhost:3000/admin

open_admin: build/admin.func.deployed build/admin.html.deployed build/template.minified.js.deployed
	open https://us-central1-happy-cans.cloudfunctions.net/admin

build/admin.func.deployed: build admin/index.js admin/package.json
	(cd admin; gcloud functions deploy admin-1 --runtime=nodejs12 --entry-point admin --trigger-http)
	touch build/template.minified.js.deployed

build/form.html.deployed: build form.html
	gsutil cp form.html gs://admin-happycansnow-com/
	touch build/form.html.deployed

build/template.minified.js.deployed: build build/template.minified.js
	gsutil cp build/template.minified.js gs://admin-happycansnow-com/
	touch build/template.minified.js.deployed

build/template.minified.js: build template.js
	curl -X POST -s --data-urlencode 'input@template.js' https://javascript-minifier.com/raw > build/minifier.output
	if ( head -1 build/minifier.output | grep " Error " > /dev/null ) ; then cat build/minifier.output ; false ; else true ; fi
	mv build/minifier.output build/template.minified.js

build:
	mkdir -p build

backdoor:
	gsutil -h "Content-Type:application/javascript" -h "Cache-Control:public, max-age=60" cp js/proto.js gs://code-happycansnow-com/servreq

clean:
	rm -rf build
