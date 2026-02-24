<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>Echo Lanka Hosting Diagnostic</h1>";

// 1. Check PHP Version
echo "<h3>1. PHP Version</h3>";
echo "Current PHP version: " . PHP_VERSION . "<br>";
if (version_compare(PHP_VERSION, '8.1.0', '<')) {
    echo "❌ <b>Error:</b> PHP 8.1 or higher is required.<br>";
} else {
    echo "✅ PHP version is compatible.<br>";
}

// 2. Check extensions
echo "<h3>2. Required Extensions</h3>";
$extensions = ['bcmath', 'ctype', 'fileinfo', 'json', 'mbstring', 'openssl', 'pdo', 'tokenizer', 'xml', 'pdo_mysql'];
foreach ($extensions as $ext) {
    if (extension_loaded($ext)) {
        echo "✅ $ext is loaded.<br>";
    } else {
        echo "❌ <b>$ext is NOT loaded.</b><br>";
    }
}

// 3. Check Vendor folder
echo "<h3>3. Filesystem Check</h3>";
if (is_dir(__DIR__ . '/vendor')) {
    echo "✅ <b>vendor</b> folder exists.<br>";
} else {
    echo "❌ <b>CRITICAL: vendor folder is MISSING!</b> (Did you upload the vendor folder? It is required for Laravel to run.)<br>";
}

if (is_file(__DIR__ . '/.env')) {
    echo "✅ <b>.env</b> file exists.<br>";
} else {
    echo "❌ <b>CRITICAL: .env file is MISSING!</b><br>";
}

// 4. Test Database Connection
echo "<h3>4. Database Connection</h3>";
$env = parse_ini_file(__DIR__ . '/.env');
if ($env) {
    $host = $env['DB_HOST'] ?? '';
    $db   = $env['DB_DATABASE'] ?? '';
    $user = $env['DB_USERNAME'] ?? '';
    $pass = $env['DB_PASSWORD'] ?? '';

    echo "Attempting to connect to <b>$db</b> on <b>$host</b>...<br>";
    
    try {
        $dsn = "mysql:host=$host;dbname=$db;charset=utf8mb4";
        $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        echo "✅ <b>Database connection successful!</b><br>";
    } catch (PDOException $e) {
        echo "❌ <b>Database connection FAILED:</b> " . $e->getMessage() . "<br>";
    }
} else {
    echo "❌ Could not read .env file for database credentials.<br>";
}

echo "<br><hr><p>End of Diagnostic</p>";
?>
