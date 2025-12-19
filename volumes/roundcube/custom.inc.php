<?php
// Custom Roundcube configuration for docker-mailserver
// SMTP server without authentication (using PERMIT_DOCKER=network on mailserver)

$config['smtp_server'] = 'mailserver';
$config['smtp_port'] = 25;
$config['smtp_user'] = '';
$config['smtp_pass'] = '';
$config['smtp_auth_type'] = '';
