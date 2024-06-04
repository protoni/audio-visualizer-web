

function interpolateColor(color1, color2, factor) {
    const result = color1.map((c, i) => Math.round(c + factor * (color2[i] - c)));
    return `rgb(${result[0]}, ${result[1]}, ${result[2]})`;
}

function getColor(heightPercent) {
    const startColor = [50, 50, 200]; // Blue
    const midColor1 = [50, 200, 50]; // Green
    const midColor2 = [200, 200, 50]; // Yellow
    const endColor = [200, 50, 50]; // Red
    
    if (heightPercent <= 0.25) {
        return interpolateColor(startColor, midColor1, heightPercent / 0.25);
    } else if (heightPercent <= 0.5) {
        return interpolateColor(midColor1, midColor2, (heightPercent - 0.25) / 0.25);
    } else if (heightPercent <= 0.75) {
        return interpolateColor(midColor2, endColor, (heightPercent - 0.5) / 0.25);
    } else {
        return interpolateColor(endColor, endColor, 1); // Solid red
    }
}



async function setup() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const padding = 60; // Increase padding to allow space for labels

    function resizeCanvas() {
        // Adjust canvas size to fit within the padded area
        canvas.width = window.innerWidth - 40; // 20px padding on each side
        canvas.height = window.innerHeight - padding; // 40px padding on top and additional space at the bottom
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Get the audio stream from the microphone
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Create an AudioContext and an AnalyserNode
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;  // Adjust FFT size for better frequency resolution
    analyser.minDecibels = -150;
    analyser.maxDecibels = -10;
    
    // Create a MediaStreamAudioSourceNode
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const sampleRate = audioContext.sampleRate;
    const nyquist = sampleRate / 2;
    let scaleFactor = 0;
    
    // Initialize peak positions
    const peakPositions = new Float32Array(bufferLength).fill(0);

    // Event listeners for buttons
    document.getElementById('increase').addEventListener('click', () => {
        scaleFactor += 50; // Increase scale factor
    });

    document.getElementById('decrease').addEventListener('click', () => {
        scaleFactor -= 50; // Decrease scale factor
    });

    function draw() {
        requestAnimationFrame(draw);

        analyser.getByteFrequencyData(dataArray);
        
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 1.0;
        let barHeight;
        let x = 0;
        
        
        let combined = 0;
        let average = 0;
        // Calculate average amplitude
        for (let i = 0; i < bufferLength; i++) {
            combined += dataArray[i];
        }
        average = combined / dataArray.length;
        
        console.log("Avg:" + average);
        console.log(dataArray);
        
        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i];
            
            // Apply logarithmic scaling to the bar height
            //const scaledHeight = Math.log1p(barHeight) * 200;
            
            // Apply exponential scaling to the bar height
            let scaledHeight = Math.pow(barHeight / 255, 2) * canvas.height;
            
            // Add more scaling
            scaledHeight *= 5.0;
            scaledHeight -= ( 150 + scaleFactor );
            
            if(scaledHeight < 0) {
                scaledHeight = 0;
            }
            
            //scaledHeight *= .5;
            
            // Amplify the bar height significantly
            let amplifiedHeight = barHeight * 5.0;
            //amplifiedHeight -= 50;
            const red = (scaledHeight + 100) * 2;
            const green = 50;
            const blue = 50;
            
            // Determine the color segments based on the height percentage
            const overrideColor = `rgb(${red},${green},${blue})`;
            const numSegments = 100; // Number of segments for smooth gradient
            const segmentHeight = scaledHeight / numSegments;
            for (let j = 0; j < numSegments; j++) {
                const heightPercent = (j / numSegments);
                const color = getColor(heightPercent * (scaledHeight / canvas.height));//getColor(heightPercent);
                ctx.fillStyle = color;
                ctx.fillRect(x, canvas.height - (segmentHeight * (j + 1)) - 20, barWidth, segmentHeight);
            }

            // Update peak position
            if (scaledHeight > peakPositions[i]) {
                peakPositions[i] = scaledHeight - 1;
            } else {
                peakPositions[i] -= 8; // Peak falls slowly
                if (peakPositions[i] < 0) peakPositions[i] = 0;
            }

            // Draw the peak indicator
            ctx.fillStyle = 'white';
            ctx.fillRect(x, canvas.height - peakPositions[i] - 22, barWidth, 2);

            x += barWidth + 1;
        }
        
        // Draw frequency labels
        const frequencies = [0, nyquist / 4, nyquist / 2, (3 * nyquist) / 4, nyquist];
        const labels = frequencies.map(f => (f / 1000).toFixed(1) + ' kHz');
        const labelPositions = [(0 + ( padding / 2 )) + 5, canvas.width * 0.25, canvas.width * 0.5, canvas.width * 0.75, ( canvas.width - ( padding / 2) ) - 5 ];

        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';

        for (let i = 0; i < labels.length; i++) {
            const position = labelPositions[i];
            ctx.fillText(labels[i], position, canvas.height - 5); // Position labels within the additional space at the bottom of the canvas
        }
    }

    draw();
}

setup().catch(console.error);
