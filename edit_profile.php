<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'config.php';

// Get JSON data
$data = json_decode(file_get_contents('php://input'), true);

// Make sure these match the "name" attributes in your form or JS keys
$id       = $data['id'] ?? '';
$email    = $data['email'] ?? '';
$address  = $data['address'] ?? '';
$password = $data['password'] ?? '';
$first    = $data['first_name'] ?? ''; // Changed from 'first' to match form
$last     = $data['last_name'] ?? '';  // Changed from 'last' to match form
$middle   = $data['middle_name'] ?? '';
$course   = $data['course'] ?? '';
$level    = $data['year_level'] ?? ''; // Changed from 'level'

if (!$id) {
    echo json_encode(['success' => false, 'message' => 'User ID is missing.']);
    exit;
}

try {
    if (!empty($password)) {
        // Option A: User wants to change their password
        $hashed = password_hash($password, PASSWORD_DEFAULT);
        $sql = "UPDATE students SET email=?, address=?, password=?, first_name=?, last_name=?, middle_name=?, course=?, year_level=? WHERE id=?";
        $stmt = $pdo->prepare($sql);
        $params = [$email, $address, $hashed, $first, $last, $middle, $course, $level, $id];
    } else {
        // Option B: User leaves password blank (Keep current password)
        $sql = "UPDATE students SET email=?, address=?, first_name=?, last_name=?, middle_name=?, course=?, year_level=? WHERE id=?";
        $stmt = $pdo->prepare($sql);
        $params = [$email, $address, $first, $last, $middle, $course, $level, $id];
    }

    $stmt->execute($params);

    echo json_encode(['success' => true, 'message' => 'Profile updated successfully!']);
} catch (PDOException $e) {
    // If there is a duplicate email or DB error, this catches it
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>