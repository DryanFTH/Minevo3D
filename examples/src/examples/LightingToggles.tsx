import { useRef, useState } from 'react';

import { ReactMinevo3D, type ReactMinevo3DHandle } from '../../../src/ReactMinevo3D';
import type { Shading } from '../../../src/minevo3d';
import { ExampleTemplate } from '../ExampleTemplate';

const vanillaCode = `import { CharacterViewer } from 'minevo3d';

const container = document.querySelector('#character');
if (!(container instanceof HTMLElement)) throw new Error('Character container not found');

const viewer = new CharacterViewer(container, {
    animation: 'walk',
    globalLight: true,
    cameraLight: false,
    shading: 'auto',
    autoRotate: true,
});

document.querySelector('#global-light')?.addEventListener('change', event => {
    const input = event.currentTarget;
    if (input instanceof HTMLInputElement) viewer.setGlobalLight(input.checked);
});
document.querySelector('#camera-light')?.addEventListener('change', event => {
    const input = event.currentTarget;
    if (input instanceof HTMLInputElement) viewer.setCameraLight(input.checked);
});

viewer.dispose();`;

const reactCode = `import { useRef, useState } from 'react';
import { ReactMinevo3D, type ReactMinevo3DHandle } from 'minevo3d/react';
import type { Shading } from 'minevo3d/react';

export function LightingTogglesExample() {
    const viewerRef = useRef<ReactMinevo3DHandle>(null);
    const [globalOn, setGlobalOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(false);
    const [shading, setShading] = useState<Shading>('auto');

    return (
        <>
            <label>
                <input type='checkbox' checked={globalOn} onChange={event => setGlobalOn(event.target.checked)} />
                GlobalLight
            </label>
            <label>
                <input type='checkbox' checked={cameraOn} onChange={event => setCameraOn(event.target.checked)} />
                CameraLight
            </label>
            <select value={shading} onChange={event => setShading(event.target.value as Shading)}>
                <option value='auto'>auto</option>
                <option value='lit'>lit</option>
                <option value='unlit'>unlit</option>
            </select>
            <button onClick={() => console.log(viewerRef.current?.getLightState())}>
                View light status
            </button>
            <div className='h-115 w-90'>
                <ReactMinevo3D
                    ref={viewerRef}
                    animation='walk'
                    globalLight={globalOn}
                    cameraLight={cameraOn ? { enabled: true, intensity: 0.8, yaw: -25, pitch: 30 } : false}
                    shading={shading}
                    autoRotate
                />
            </div>
        </>
    );
}`;

export function LightingToggles() {
    const viewerRef = useRef<ReactMinevo3DHandle>(null);
    const [globalOn, setGlobalOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(false);
    const [shading, setShading] = useState<Shading>('auto');

    return (
        <ExampleTemplate
            number={13}
            category='Lighting'
            title='Lighting controls'
            description='Turn the global light and camera-following light on or off, then choose a shading mode. Disabled lights are skipped during rendering.'
            vanillaCode={vanillaCode}
            reactCode={reactCode}
            preview={
                <div className='h-115 w-90'>
                    <ReactMinevo3D
                        ref={viewerRef}
                        animation='walk'
                        globalLight={globalOn}
                        cameraLight={
                            cameraOn
                                ? { enabled: true, intensity: 0.8, yaw: -25, pitch: 30 }
                                : false
                        }
                        shading={shading}
                        autoRotate
                    />
                </div>
            }
            controls={
                <>
                    <label className='flex items-center gap-2'>
                        <input
                            className='m-0 flex-none'
                            type='checkbox'
                            checked={globalOn}
                            onChange={event => setGlobalOn(event.target.checked)}
                        />
                        GlobalLight
                    </label>
                    <label className='flex items-center gap-2'>
                        <input
                            className='m-0 flex-none'
                            type='checkbox'
                            checked={cameraOn}
                            onChange={event => setCameraOn(event.target.checked)}
                        />
                        CameraLight
                    </label>
                    <label>
                        Shading mode
                        <select
                            value={shading}
                            onChange={event => setShading(event.target.value as Shading)}
                        >
                            <option value='auto'>auto</option>
                            <option value='lit'>lit</option>
                            <option value='unlit'>unlit (fastest)</option>
                        </select>
                    </label>
                    <button
                        onClick={() => console.log(viewerRef.current?.getLightState())}
                    >
                        View light status
                    </button>
                </>
            }
        />
    );
}
