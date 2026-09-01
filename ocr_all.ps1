# Self-contained PowerShell script to run OCR on all images in your Additional data folder
# Using the native Windows Media OCR API

Add-Type -AssemblyName System.Runtime.WindowsRuntime

# Get the AsTask extension method via reflection to handle WinRT async operations
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | 
    Where-Object { 
        $_.Name -eq 'AsTask' -and 
        $_.GetParameters().Count -eq 1 -and 
        $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' 
    })[0]

function Await-WinRt($AsyncOp, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($AsyncOp))
    $netTask.Wait(-1) | Out-Null
    return $netTask.Result
}

# Initialize WinRT types
[void][Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
[void][Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
[void][Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]

$imagesDir = "C:\Users\DELL\GitHub\Goa-Panchayati-Raj\Additional data"
$outputFile = "C:\Users\DELL\.gemini\antigravity\scratch\goa-panchayat-tracker\ocr_results.txt"
$divider = "=" * 80

# Clean output file if exists
if (Test-Path $outputFile) { Remove-Item $outputFile }

if (-not (Test-Path $imagesDir)) {
    Write-Error "Images directory not found: $imagesDir"
    exit
}

$images = Get-ChildItem -Path $imagesDir -Filter "*.jpg" | Sort-Object Name
$total = $images.Count

Write-Host "Found $total images to process in $imagesDir"

$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if ($engine -eq $null) {
    Write-Error "Could not initialize OCR Engine. Please ensure a Windows Language Pack (English) is installed."
    exit
}

$count = 0
foreach ($img in $images) {
    $count++
    $imgPath = $img.FullName
    Write-Host "[$count/$total] OCR processing: $($img.Name)..."
    
    try {
        $asyncOp1 = [Windows.Storage.StorageFile]::GetFileFromPathAsync($imgPath)
        $file = Await-WinRt $asyncOp1 ([Windows.Storage.StorageFile])
        
        $asyncOp2 = $file.OpenAsync([Windows.Storage.FileAccessMode]::Read)
        $stream = Await-WinRt $asyncOp2 ([Windows.Storage.Streams.IRandomAccessStream])
        
        $asyncOp3 = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)
        $decoder = Await-WinRt $asyncOp3 ([Windows.Graphics.Imaging.BitmapDecoder])
        
        $asyncOp4 = $decoder.GetSoftwareBitmapAsync()
        $bitmap = Await-WinRt $asyncOp4 ([Windows.Graphics.Imaging.SoftwareBitmap])
        
        $asyncOp5 = $engine.RecognizeAsync($bitmap)
        $ocrResult = Await-WinRt $asyncOp5 ([Windows.Media.Ocr.OcrResult])
        
        $text = $ocrResult.Text
        
        # Append to results file
        Add-Content -Path $outputFile -Value $divider
        Add-Content -Path $outputFile -Value "FILE: $($img.Name)"
        Add-Content -Path $outputFile -Value $divider
        Add-Content -Path $outputFile -Value $text
        Add-Content -Path $outputFile -Value "`n`n"
        
    } catch {
        Write-Warning "Failed to process $($img.Name): $_"
        Add-Content -Path $outputFile -Value $divider
        Add-Content -Path $outputFile -Value "FILE: $($img.Name) - ERROR: $_"
        Add-Content -Path $outputFile -Value $divider
        Add-Content -Path $outputFile -Value "`n`n"
    }
}

Write-Host "OCR process complete! Consolidated text saved to: $outputFile"
