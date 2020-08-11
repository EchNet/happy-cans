deploy:
	gsutil -h "Content-Type:application/javascript" -h "Cache-Control:public, max-age=300" cp js/proto.js gs://code-happycansnow-com/servreq
