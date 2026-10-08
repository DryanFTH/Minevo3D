import { useState } from 'react';

import { ReactMinevo3D } from '../../../src/ReactMinevo3D';
import { ExampleTemplate } from '../ExampleTemplate';

const vanillaCode = `import { CharacterViewer } from 'minevo3d';

const container = document.querySelector('#character');
if (!(container instanceof HTMLElement)) throw new Error('Character container not found');

const viewer = new CharacterViewer(container, {
    zoom: 1,
    fov: 40,
    cameraTransition: { duration: 0.8, ease: 'easeInOut' },
});

document.querySelector('#toggle-zoom')?.addEventListener('click', () => {
    const close = viewer.getZoom() === 1;
    viewer.setZoom(close ? 2.5 : 1);
    viewer.setFov(close ? 25 : 40);
});

viewer.dispose();`;

const reactCode = `import { useState } from 'react';
import { ReactMinevo3D } from 'minevo3d/react';

export function ZoomWithTransitionExample() {
    const [isClose, setIsClose] = useState(false);

    return (
        <>
            <button onClick={() => setIsClose(value => !value)}>
                {isClose ? 'Zoom out' : 'Zoom in'}
            </button>
            <div className='h-105 w-80'>
                <ReactMinevo3D
                    zoom={isClose ? 2.5 : 1}
                    fov={isClose ? 25 : 40}
                    cameraTransition={{ duration: 0.8, ease: 'easeInOut' }}
                />
            </div>
        </>
    );
}`;

export function ZoomWithTransition() {
    const [isClose, setIsClose] = useState(false);

    return (
        <ExampleTemplate
            number={12}
            category='Camera'
            title='Zoom transition'
            description='Change the zoom and field of view with props. cameraTransition animates camera changes with a smooth easing effect.'
            vanillaCode={vanillaCode}
            reactCode={reactCode}
            preview={
                <div className='h-105 w-80'>
                    <ReactMinevo3D
                        zoom={isClose ? 2.5 : 1}
                        fov={isClose ? 25 : 40}
                        cameraTransition={{ duration: 0.8, ease: 'easeInOut' }}
                    />
                </div>
            }
            controls={
                <button onClick={() => setIsClose(value => !value)}>
                    {isClose ? 'Zoom out' : 'Zoom in'}
                </button>
            }
        />
    );
}
