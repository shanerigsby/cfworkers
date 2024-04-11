export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, HEAD, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Headers' : 'x-worker-key,Content-Type,x-custom-metadata,Content-MD5,x-amz-meta-fileid,x-amz-meta-account_id,x-amz-meta-clientid,x-amz-meta-file_id,x-amz-meta-opportunity_id,x-amz-meta-client_id,x-amz-meta-webhook',
    'Access-Control-Allow-Credentials' : 'true',
    'Allow': 'GET, POST, PUT, DELETE, HEAD, OPTIONS'
};