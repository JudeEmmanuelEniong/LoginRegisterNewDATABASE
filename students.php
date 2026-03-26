<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'config.php';

$action = $_GET['action'] ?? '';

if ($action === 'getAll') {
    $stmt = $pdo->query("SELECT * FROM students ORDER BY last_name ASC");
    $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['students' => $students]);
    exit;
}

if ($action === 'search') {
    $q = '%' . ($_GET['q'] ?? '') . '%';
    $stmt = $pdo->prepare("SELECT * FROM students WHERE id LIKE ? OR last_name LIKE ? OR first_name LIKE ?");
    $stmt->execute([$q, $q, $q]);
    $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['students' => $students]);
    exit;
}

if ($action === 'stats') {
    $registered = $pdo->query("SELECT COUNT(*) FROM students")->fetchColumn();
    $current    = $pdo->query("SELECT COUNT(*) FROM sitin_records WHERE status = 'Active'")->fetchColumn();
    $total      = $pdo->query("SELECT COUNT(*) FROM sitin_records")->fetchColumn();
    $purposes   = $pdo->query("SELECT purpose, COUNT(*) as count FROM sitin_records GROUP BY purpose")->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode([
        'registered' => $registered,
        'current'    => $current,
        'total'      => $total,
        'purposes'   => $purposes
    ]);
    exit;
}

$data    = json_decode(file_get_contents('php://input'), true);
$action  = $data['action'] ?? '';

if ($action === 'add') {
    $check = $pdo->prepare("SELECT id FROM students WHERE id = ?");
    $check->execute([$data['id']]);
    if ($check->fetch()) {
        echo json_encode(['success' => false, 'message' => 'ID already exists!']);
        exit;
    }
    $stmt = $pdo->prepare("INSERT INTO students (id, last_name, first_name, year_level, course, sessions, email, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $data['id'],
        $data['last'],
        $data['first'],
        $data['level'],
        $data['course'],
        $data['sessions'] ?? 30,
        $data['email'] ?? '',
        password_hash('password123', PASSWORD_DEFAULT)
    ]);
    echo json_encode(['success' => true, 'message' => 'Student added successfully!']);
    exit;
}

if ($action === 'edit') {
    $stmt = $pdo->prepare("UPDATE students SET last_name=?, first_name=?, year_level=?, course=?, sessions=? WHERE id=?");
    $stmt->execute([
        $data['last'],
        $data['first'],
        $data['level'],
        $data['course'],
        $data['sessions'],
        $data['editId']
    ]);
    echo json_encode(['success' => true, 'message' => 'Student updated successfully!']);
    exit;
}

if ($action === 'delete') {
    $stmt = $pdo->prepare("DELETE FROM students WHERE id = ?");
    $stmt->execute([$data['id']]);
    echo json_encode(['success' => true, 'message' => 'Student deleted.']);
    exit;
}

if ($action === 'resetSessions') {
    $pdo->query("UPDATE students SET sessions = 30");
    echo json_encode(['success' => true, 'message' => 'All sessions reset.']);
    exit;
}
?>