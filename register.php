<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'config.php';

$data = json_decode(file_get_contents('php://input'), true);

$id       = $data['id'] ?? '';
$last     = $data['last'] ?? '';
$first    = $data['first'] ?? '';
$middle   = $data['middle'] ?? '';
$level    = $data['level'] ?? '';
$course   = $data['course'] ?? '';
$email    = $data['email'] ?? '';
$password = $data['password'] ?? '';
$address  = $data['address'] ?? '';

if (!$id || !$last || !$first || !$level || !$course || !$email || !$password) {
    echo json_encode(['success' => false, 'message' => 'All fields are required.']);
    exit;
}

try {
    $check = $pdo->prepare("SELECT id FROM students WHERE id = ?");
    $check->execute([$id]);
    if ($check->fetch()) {
        echo json_encode(['success' => false, 'message' => 'ID already exists!']);
        exit;
    }

    $hashed = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare("INSERT INTO students 
        (id, last_name, first_name, middle_name, year_level, course, email, password, address) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$id, $last, $first, $middle, $level, $course, $email, $hashed, $address]);

    echo json_encode(['success' => true, 'message' => 'Registration Successful!']);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
?>