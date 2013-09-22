<?php
	require_once 'jsonRPCClient.class.php';
        require_once 'credentials.class.php';

	$bitcoin = new jsonRPCClient('http://'.$username.':'.$password.'@'.$url.':'.$port.'/');
?>
