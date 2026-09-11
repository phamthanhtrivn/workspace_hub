param(
  [int]$TimeoutSeconds = 120,
  [int]$IntervalSeconds = 3,
  [string]$KongBaseUrl = "http://localhost:8000"
)

$services = @(
  @{ Name = "user-service"; DirectUrl = "http://localhost:8081/ready"; KongUrl = "$KongBaseUrl/health/user" },
  @{ Name = "project-service"; DirectUrl = "http://localhost:8082/ready"; KongUrl = "$KongBaseUrl/health/project" },
  @{ Name = "communication-service"; DirectUrl = "http://localhost:8083/ready"; KongUrl = "$KongBaseUrl/health/communication" },
  @{ Name = "notification-service"; DirectUrl = "http://localhost:8084/ready"; KongUrl = "$KongBaseUrl/health/notification" },
  @{ Name = "document-service"; DirectUrl = "http://localhost:8085/ready"; KongUrl = "$KongBaseUrl/health/document" },
  @{ Name = "calendar-service"; DirectUrl = "http://localhost:8086/ready"; KongUrl = "$KongBaseUrl/health/calendar" }
)

function Test-ReadyUrl {
  param(
    [string]$Name,
    [string]$Url
  )

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
      return @{ Ready = $true; Message = "OK" }
    }

    return @{
      Ready = $false
      Message = "HTTP $($response.StatusCode)"
    }
  } catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $body = ""

    if ($_.Exception.Response -and $_.Exception.Response.GetResponseStream()) {
      try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $body = $reader.ReadToEnd()
      } catch {
        $body = ""
      }
    }

    $message = $_.Exception.Message
    if ($statusCode) {
      $message = "HTTP $statusCode $message"
    }
    if ($body) {
      $message = "$message - $body"
    }

    return @{ Ready = $false; Message = $message }
  }
}

function Test-AllServices {
  param([bool]$ViaKong)

  $failed = @()

  foreach ($service in $services) {
    $url = if ($ViaKong) { $service.KongUrl } else { $service.DirectUrl }
    $result = Test-ReadyUrl -Name $service.Name -Url $url

    if (-not $result.Ready) {
      $failed += @{
        Name = $service.Name
        Url = $url
        Message = $result.Message
      }
    }
  }

  return $failed
}

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$lastDirectFailures = @()
$lastKongFailures = @()

Write-Host "Waiting for host backend services to become ready..."

while ((Get-Date) -lt $deadline) {
  $lastDirectFailures = Test-AllServices -ViaKong $false

  if ($lastDirectFailures.Count -eq 0) {
    Write-Host "Host services are ready. Checking Kong proxy routes..."
    $lastKongFailures = Test-AllServices -ViaKong $true

    if ($lastKongFailures.Count -eq 0) {
      Write-Host "Backend ready via Kong: $KongBaseUrl"
      exit 0
    }
  }

  Start-Sleep -Seconds $IntervalSeconds
}

Write-Host "Backend is not ready after $TimeoutSeconds seconds."

if ($lastDirectFailures.Count -gt 0) {
  Write-Host ""
  Write-Host "Direct host service failures:"
  foreach ($failure in $lastDirectFailures) {
    Write-Host "- $($failure.Name) $($failure.Url): $($failure.Message)"
  }
}

if ($lastKongFailures.Count -gt 0) {
  Write-Host ""
  Write-Host "Kong proxy failures:"
  foreach ($failure in $lastKongFailures) {
    Write-Host "- $($failure.Name) $($failure.Url): $($failure.Message)"
  }
}

exit 1
