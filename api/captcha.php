<?php
// Simple self-hosted SVG CAPTCHA (no external deps)
// Stores the solution in $_SESSION['captcha_code']

@session_start();

function make_code($len = 5) {
  $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  $out = '';
  for ($i=0; $i<$len; $i++) {
    $out .= $chars[random_int(0, strlen($chars)-1)];
  }
  return $out;
}

$code = make_code(5);
$_SESSION['captcha_code'] = $code;

header('Content-Type: image/svg+xml; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$w = 120; $h = 40;
$letters = str_split($code);
$colors = ['#0b2239', '#B69B5C', '#6c757d'];

echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
?>
<svg xmlns="http://www.w3.org/2000/svg" width="<?= $w ?>" height="<?= $h ?>" viewBox="0 0 <?= $w ?> <?= $h ?>">
  <rect width="100%" height="100%" fill="#f7f8f9"/>
  <?php for ($i=0;$i<8;$i++): ?>
    <circle cx="<?= random_int(0,$w) ?>" cy="<?= random_int(0,$h) ?>" r="<?= random_int(1,3) ?>" fill="<?= $colors[array_rand($colors)] ?>" opacity=".25"/>
  <?php endfor; ?>
  <?php $x=10; foreach ($letters as $i => $ch): $y = 26 + random_int(-3,3); $rx = $x + random_int(-2,2); $rot = random_int(-12,12); $col = $colors[array_rand($colors)]; $x += 20 + random_int(0,4); ?>
    <g transform="translate(<?= $rx ?>,<?= $y ?>) rotate(<?= $rot ?>)">
      <text x="0" y="0" font-family="Inter,Arial,Helvetica,sans-serif" font-size="22" font-weight="700" fill="<?= $col ?>"><?= htmlspecialchars($ch, ENT_QUOTES|ENT_SUBSTITUTE, 'UTF-8') ?></text>
    </g>
  <?php endforeach; ?>
  <line x1="<?= random_int(0,intval($w/2)) ?>" y1="<?= random_int(0,$h) ?>" x2="<?= random_int(intval($w/2),$w) ?>" y2="<?= random_int(0,$h) ?>" stroke="#B69B5C" stroke-opacity=".35"/>
</svg>
