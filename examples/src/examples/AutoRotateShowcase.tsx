import { useState } from 'react';

import { ReactMinevo3D } from '../../../src/ReactMinevo3D';
import { ExampleTemplate } from '../ExampleTemplate';

const vanillaCode = `import { CharacterViewer } from 'minevo3d';

const container = document.querySelector('#character');
if (!(container instanceof HTMLElement)) throw new Error('Character container not found');

const viewer = new CharacterViewer(container, {
    autoRotate: { speed: 20, resumeDelay: 1.5, ramp: 0.8, pauseOnHover: true },
    controls: { zoom: true },
});

document.querySelector('#pause')?.addEventListener('click', () => viewer.setAutoRotate(false));
document.querySelector('#start')?.addEventListener('click', () => viewer.setAutoRotate({ speed: 20, resumeDelay: 1.5, ramp: 0.8, pauseOnHover: true }));

viewer.dispose();`;

const reactCode = `import { useState } from 'react';
import { ReactMinevo3D } from 'minevo3d/react';

export function AutoRotateExample() {
    const [isRotating, setIsRotating] = useState(true);
    const [isReversed, setIsReversed] = useState(false);
    const [speed, setSpeed] = useState(20);

    return (
        <>
            <button onClick={() => setIsRotating(value => !value)}>
                {isRotating ? 'Pause' : 'Rotate'}
            </button>
            <button onClick={() => setIsReversed(value => !value)}>Reverse direction</button>
            <label>
                Speed {speed}°/second
                <input
                    type='range'
                    min={5}
                    max={90}
                    value={speed}
                    onChange={event => setSpeed(Number(event.target.value))}
                />
            </label>
            <div className='h-115 w-90'>
                <ReactMinevo3D
                    autoRotate={isRotating ? {
                        speed: isReversed ? -speed : speed,
                        resumeDelay: 1.5,
                        ramp: 0.8,
                        pauseOnHover: true,
                    } : false}
                    controls={{ zoom: true }}
                />
            </div>
        </>
    );
}`;

export function AutoRotateShowcase() {
    const [isRotating, setIsRotating] = useState(true);
    const [isReversed, setIsReversed] = useState(false);
    const [speed, setSpeed] = useState(20);

    return (
        <ExampleTemplate
            number={15}
            category='Camera'
            title='Auto-rotate'
            description='Adjust the camera rotation speed and direction. Rotation pauses during interaction and resumes after a delay. It also pauses while the pointer is over the preview.'
            vanillaCode={vanillaCode}
            reactCode={reactCode}
            preview={
                <div className='h-115 w-90'>
                    <ReactMinevo3D
                        autoRotate={
                            isRotating
                                ? {
                                      speed: isReversed ? -speed : speed,
                                      resumeDelay: 1.5,
                                      ramp: 0.8,
                                      pauseOnHover: true,
                                  }
                                : false
                        }
                        controls={{ zoom: true }}
                    />
                </div>
            }
            controls={
                <>
                    <button onClick={() => setIsRotating(value => !value)}>
                        {isRotating ? 'Pause' : 'Rotate'}
                    </button>
                    <button onClick={() => setIsReversed(value => !value)}>
                        Reverse direction
                    </button>
                    <label>
                        Speed {speed}°/second
                        <input
                            type='range'
                            min={5}
                            max={90}
                            value={speed}
                            onChange={event => setSpeed(Number(event.target.value))}
                        />
                    </label>
                </>
            }
        />
    );
}
