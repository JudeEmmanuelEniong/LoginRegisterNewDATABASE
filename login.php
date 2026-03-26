<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'config.php';

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data) {
    echo json_encode(['success' => false, 'message' => 'Invalid request.']);
    exit;
}

$id       = $data['id'] ?? '';
$password = $data['password'] ?? '';

if (!$id || !$password) {
    echo json_encode(['success' => false, 'message' => 'Please enter ID and password.']);
    exit;
}

try {
    // Check admin
    $adminStmt = $pdo->prepare("SELECT * FROM admin WHERE username = ?");
    $adminStmt->execute([$id]);
    $admin = $adminStmt->fetch(PDO::FETCH_ASSOC);

    if ($admin && $password === $admin['password']) {
        echo json_encode([
            'success' => true,
            'role'    => 'admin',
            'message' => 'Welcome, Admin!'
        ]);
        exit;
    }

    // Check student
    $stmt = $pdo->prepare("SELECT * FROM students WHERE id = ?");
    $stmt->execute([$id]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($student && password_verify($password, $student['password'])) {
        echo json_encode([
            'success' => true,
            'role'    => 'student',
            'message' => 'Login successful! Welcome ' . $student['first_name'],
       'student' => [
    'id'       => $student['id'],
    'first'    => $student['first_name'],
    'last'     => $student['last_name'],
    'course'   => $student['course'],
    'level'    => $student['year_level'],
    'sessions' => $student['sessions'],
    'email'    => $student['email'],
    'address'  => $student['address']
]
        ]);
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Invalid ID or password!']);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}
?>