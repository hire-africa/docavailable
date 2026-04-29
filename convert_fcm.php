<?php
$dir = __DIR__ . '/backend/app/Notifications';
$files = glob($dir . '/*.php');

foreach ($files as $file) {
    if (basename($file) === 'DoctorRejectedNotification.php' || basename($file) === 'AppointmentActivated.php' || basename($file) === 'ScheduledSessionActivated.php') {
        continue;
    }

    $content = file_get_contents($file);
    if (!str_contains($content, 'function toFcm')) {
        continue;
    }

    // if already uses FcmMessage, skip
    if (str_contains($content, 'return FcmMessage::create()')) {
        continue;
    }

    // Add imports if missing
    $imports = [
        "use NotificationChannels\\Fcm\\FcmChannel;",
        "use NotificationChannels\\Fcm\\FcmMessage;",
        "use NotificationChannels\\Fcm\\Resources\\AndroidConfig;",
        "use NotificationChannels\\Fcm\\Resources\\AndroidNotification;",
        "use NotificationChannels\\Fcm\\Resources\\ApnsConfig;",
        "use NotificationChannels\\Fcm\\Resources\\ApnsFcmOptions;"
    ];

    $lines = explode("\n", $content);
    $newLines = [];
    $importsAdded = false;
    $hasFcmMessageImport = str_contains($content, "use NotificationChannels\\Fcm\\FcmMessage;");

    if (!$hasFcmMessageImport) {
        $lastImportIndex = 0;
        foreach ($lines as $i => $line) {
            if (str_starts_with($line, 'use ')) {
                $lastImportIndex = $i;
            }
        }

        foreach ($lines as $i => $line) {
            $newLines[] = $line;
            if ($i === $lastImportIndex) {
                foreach ($imports as $import) {
                    if (!str_contains($content, $import)) {
                        $newLines[] = $import;
                    }
                }
            }
        }
    } else {
        $newLines = $lines;
    }

    $content = implode("\n", $newLines);

    // regex to match:
    // public function toFcm(...): array
    // {
    //     return [ ... ];
    // }

    // We'll replace it by extracting the title, body, and data.
    preg_match('/public function toFcm\([^)]*\)(?:\s*:\s*array)?\s*\{\s*return\s*\[(.*?)\];\s*\}/s', $content, $matches);

    if (empty($matches)) {
        echo "Could not parse " . basename($file) . "\n";
        continue;
    }

    $arrayContent = $matches[1];

    // basic extraction
    preg_match('/\'title\'\s*=>\s*(.+?),/m', $arrayContent, $titleMatch);
    preg_match('/\'body\'\s*=>\s*(.+?),/m', $arrayContent, $bodyMatch);

    $title = $titleMatch ? trim($titleMatch[1]) : "'Notification'";
    $body = $bodyMatch ? trim($bodyMatch[1]) : "''";

    // Extract data array
    preg_match('/\'data\'\s*=>\s*\[(.*?)\]/s', $arrayContent, $dataMatch);
    $dataPart = $dataMatch ? trim($dataMatch[1]) : "";

    $fcmCode = <<<PHP
    public function toFcm(\$notifiable)
    {
        return FcmMessage::create()
            ->setData([
                $dataPart
            ])
            ->setNotification(
                \NotificationChannels\Fcm\Resources\Notification::create()
                    ->setTitle($title)
                    ->setBody($body)
            )
            ->setAndroid(
                AndroidConfig::create()
                    ->setFcmOptions(AndroidNotification::create()->setColor('#0A0A0A'))
                    ->setNotification(AndroidNotification::create()->setChannelId('system_channel'))
            )->setApns(
                ApnsConfig::create()
                    ->setFcmOptions(ApnsFcmOptions::create()->setAnalyticsLabel('analytics_ios'))
            );
    }
PHP;

    $content = preg_replace('/public function toFcm\([^)]*\)(?:\s*:\s*array)?\s*\{\s*return\s*\[(.*?)\];\s*\}/s', $fcmCode, $content);

    file_put_contents($file, $content);
    echo "Updated " . basename($file) . "\n";
}
