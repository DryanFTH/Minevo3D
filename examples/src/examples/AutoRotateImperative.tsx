import { useRef, useState } from 'react';

import { ReactMinevo3D, type ReactMinevo3DHandle } from '../../../src/ReactMinevo3D';
import { ExampleTemplate } from '../ExampleTemplate';

const vanillaCode = `import { CharacterViewer } from 'minevo3d';

const container = document.querySelector('#character');
if (!(container instanceof HTMLElement)) throw new Error('Character container not found');

const viewer = new CharacterViewer(container, {
    autoRotate: { speed: 25, resumeDelay: Infinity },
});

document.querySelector('#start')?.addEventListener('click', () => viewer.startAutoRotate());
document.querySelector('#stop')?.addEventListener('click', () => viewer.stopAutoRotate());

// Call this when the viewer element is removed.
viewer.dispose();`;

const reactCode = `import { useRef, useState } from 'react';
import { ReactMinevo3D, type ReactMinevo3DHandle } from 'minevo3d/react';

export function AutoRotateExample() {
    const characterRef = useRef<ReactMinevo3DHandle>(null);
    const [isRotating, setIsRotating] = useState(true);

    return (
        <>
            <p>Auto-rotate: {isRotating ? 'On' : 'Off'}</p>
            <button onClick={() => { characterRef.current?.startAutoRotate(); setIsRotating(true); }}>Start</button>
            <button onClick={() => { characterRef.current?.stopAutoRotate(); setIsRotating(false); }}>Stop</button>
            <div className='h-105 w-80'>
                <ReactMinevo3D
                    ref={characterRef}
                    autoRotate={{ speed: 25, resumeDelay: Infinity }}
                />
            </div>
        </>
    );
}`;

export function AutoRotateImperative() {
    const characterRef = useRef<ReactMinevo3DHandle>(null);
    const [isRotating, setIsRotating] = useState(true);

    return (
        <ExampleTemplate
            number={15}
            category='Camera'
            title='Control auto-rotate with a ref'
            description='Start or stop camera rotation with the imperative API. A resume delay of Infinity prevents rotation from restarting automatically after interaction.'
            vanillaCode={vanillaCode}
            reactCode={reactCode}
            preview={
                <div className='h-105 w-80'>
                    <ReactMinevo3D
                        ref={characterRef}
                        autoRotate={{ speed: 25, resumeDelay: Infinity }}
                    />
                </div>
            }
            controls={
                <>
                    <p
                        className='m-0 mb-2 text-[#8b91a3] [&_strong]:text-[#5ad17a]!'
                        aria-live='polite'
                    >
                        Auto-rotate: <strong>{isRotating ? 'On' : 'Off'}</strong>
                    </p>
                    <button
                        onClick={() => {
                            characterRef.current?.startAutoRotate();
                            setIsRotating(true);
                        }}
                    >
                        Start
                    </button>
                    <button
                        onClick={() => {
                            characterRef.current?.stopAutoRotate();
                            setIsRotating(false);
                        }}
                    >
                        Stop
                    </button>
                </>
            }
        ></ExampleTemplate>
    );
}
