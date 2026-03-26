<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'config.php';

$action = $_GET['action'] ?? '';

if ($action === 'getAll') {
    $stmt = $pdo->query("SELECT * FROM announcements ORDER BY posted_at DESC");
    $announcements = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['announcements' => $announcements]);
    exit;
}

$data   = json_decode(file_get_contents('php://input'), true);
$action = $data['action'] ?? '';

if ($action === 'post') {
    $message = $data['message'] ?? '';

    if (!$message) {
        echo json_encode(['success' => false, 'message' => 'Message is required.']);
        exit;
    }

    $stmt = $pdo->prepare("INSERT INTO announcements (message) VALUES (?)");
    $stmt->execute([$message]);

    echo json_encode(['success' => true, 'message' => 'Announcement posted!']);
    exit;
}

if ($action === 'delete') {
    $id = $data['id'] ?? '';
    $stmt = $pdo->prepare("DELETE FROM announcements WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(['success' => true, 'message' => 'Announcement deleted.']);
    exit;
}
?>