<?php

$hosts = ['127.0.0.1', 'localhost'];
$ports = [3306, 3307, 3308, 33060];
$users = ['root'];
$passwords = ['', 'root', 'password']; 

echo "Checking MySQL connection...\n";

foreach ($hosts as $host) {
    foreach ($ports as $port) {
        foreach ($users as $user) {
            foreach ($passwords as $password) {
                try {
                    echo "Trying $host:$port (User: $user, Pass: " . ($password ? '***' : '(empty)') . ")... ";
                    
                    // Suppress warnings for connection attempts
                    $pdo = new PDO("mysql:host=$host;port=$port", $user, $password, [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_TIMEOUT => 2
                    ]);
                    
                    echo "SUCCESS!\n";
                    echo "Connected to MySQL on $host:$port with user '$user'.\n";
                    
                    // Try to create database
                    echo "Attempting to create database 'laravel'...\n";
                    $pdo->exec("CREATE DATABASE IF NOT EXISTS laravel");
                    echo "Database 'laravel' created or already exists.\n";
                    
                    // Output valid config for parsing
                    echo "VALID_CONFIG:HOST=$host;PORT=$port;USER=$user;PASSWORD=$password\n";
                    exit(0);
                    
                } catch (PDOException $e) {
                    echo "Failed: " . $e->getMessage() . "\n";
                }
            }
        }
    }
}

echo "All connection attempts failed.\n";
exit(1);
