<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'config.php';

$action = $_GET['action'] ?? '';

if ($action === 'getAll') {
    $stmt = $pdo->query("SELECT * FROM sitin_records ORDER BY date_in DESC");
    $sitins = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['sitins' => $sitins]);
    exit;
}

if ($action === 'reports') {
    $stmt = $pdo->query("SELECT purpose, COUNT(*) as count FROM sitin_records GROUP BY purpose");
    $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['reports' => $reports]);
    exit;
}

$data   = json_decode(file_get_contents('php://input'), true);
$action = $data['action'] ?? '';

if ($action === 'sitIn') {
    $student_id = $data['student_id'] ?? '';
    $purpose    = $data['purpose'] ?? '';
    $lab        = $data['lab'] ?? '';

    // Check if student exists
    $check = $pdo->prepare("SELECT * FROM students WHERE id = ?");
    $check->execute([$student_id]);
    $student = $check->fetch(PDO::FETCH_ASSOC);

    if (!$student) {
        echo json_encode(['success' => false, 'message' => 'Student not found!']);
        exit;
    }

    if ($student['sessions'] <= 0) {
        echo json_encode(['success' => false, 'message' => 'No remaining sessions!']);
        exit;
    }

    // Check if already sitting in
    $active = $pdo->prepare("SELECT * FROM sitin_records WHERE student_id = ? AND status = 'Active'");
    $active->execute([$student_id]);
    if ($active->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Student is already sitting in!']);
        exit;
    }

    // Insert sit-in record
    $stmt = $pdo->prepare("INSERT INTO sitin_records (student_id, student_name, purpose, lab, session_num) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([
        $student_id,
        $student['last_name'] . ', ' . $student['first_name'],
        $purpose,
        $lab,
        $student['sessions']
    ]);

    // Decrease session
    $update = $pdo->prepare("UPDATE students SET sessions = sessions - 1 WHERE id = ?");
    $update->execute([$student_id]);

    echo json_encode(['success' => true, 'message' => 'Sit-in recorded successfully!']);
    exit;
}

if ($action === 'endSitIn') {
    $sit_id = $data['sit_id'] ?? '';
    $stmt = $pdo->prepare("UPDATE sitin_records SET status = 'Done', date_out = NOW() WHERE sit_id = ?");
    $stmt->execute([$sit_id]);
    echo json_encode(['success' => true, 'message' => 'Sit-in ended.']);
    exit;
}

if ($action === 'getByStudent') {
    $id = $_GET['id'] ?? '';
    $stmt = $pdo->prepare("SELECT * FROM sitin_records WHERE student_id = ? ORDER BY date_in DESC");
    $stmt->execute([$id]);
    $sitins = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['sitins' => $sitins]);
    exit;
}
?>