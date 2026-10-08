import { useRef, useState } from 'react';

import { ReactMinevo3D, type ReactMinevo3DHandle } from '../../../src/ReactMinevo3D';
import { ExampleTemplate } from '../ExampleTemplate';

const vanillaCode = `import { CharacterViewer } from 'minevo3d';

const container = document.querySelector('#character');
if (!(container instanceof HTMLElement)) throw new Error('Character container not found');

const viewer = new CharacterViewer(container, {
    fov: 40,
    zoom: 1,
    camera: { keepFraming: false, minZoom: 0.3, maxZoom: 5 },
    controls: { zoom: true, resetOnDoubleClick: true },
});

viewer.onCameraChange(({ fov, zoom }) => {
    console.log('FOV:', fov, 'Zoom:', zoom);
});

document.querySelector('#zoom-in')?.addEventListener('click', () => viewer.zoomIn());
document.querySelector('#zoom-out')?.addEventListener('click', () => viewer.zoomOut());
document.querySelector('#reset')?.addEventListener('click', () => viewer.resetCamera());

viewer.dispose();`;

const reactCode = `import { useRef, useState } from 'react';
import { ReactMinevo3D, type ReactMinevo3DHandle } from 'minevo3d/react';

export function ZoomAndFovExample() {
    const viewerRef = useRef<ReactMinevo3DHandle>(null);
    const [zoom, setZoom] = useState(1);
    const [fov, setFov] = useState(40);
    const [keepFraming, setKeepFraming] = useState(false);

    return (
        <>
            <label>
                FOV {Math.round(fov)}°
                <input
                    type='range'
                    min={10}
                    max={100}
                    value={fov}
                    onChange={event => setFov(Number(event.target.value))}
                />
            </label>
            <label>
                Zoom {zoom.toFixed(2)}×
                <input
                    type='range'
                    min={0.3}
                    max={5}
                    step={0.05}
                    value={zoom}
                    onChange={event => setZoom(Number(event.target.value))}
                />
            </label>
            <label>
                <input
                    type='checkbox'
                    checked={keepFraming}
                    onChange={event => setKeepFraming(event.target.checked)}
                />
                Keep the same size when FOV changes
            </label>
            <button onClick={() => viewerRef.current?.zoomIn()}>＋</button>
            <button onClick={() => viewerRef.current?.zoomOut()}>－</button>
            <button onClick={() => viewerRef.current?.resetCamera()}>Reset</button>
            <div className='h-115 w-90'>
                <ReactMinevo3D
                    ref={viewerRef}
                    fov={fov}
                    zoom={zoom}
                    camera={{ keepFraming, minZoom: 0.3, maxZoom: 5 }}
                    controls={{ zoom: true, resetOnDoubleClick: true }}
                    onCameraChange={state => {
                        setZoom(Number(state.zoom.toFixed(3)));
                        setFov(state.fov);
                    }}
                />
            </div>
        </>
    );
}`;

export function ZoomAndFov() {
    const viewerRef = useRef<ReactMinevo3DHandle>(null);
    const [zoom, setZoom] = useState(1);
    const [fov, setFov] = useState(40);
    const [keepFraming, setKeepFraming] = useState(false);

    return (
        <ExampleTemplate
            number={9}
            category='Camera'
            title='FOV and zoom'
            description='Adjust the field of view and zoom with the sliders, scroll or pinch on the preview, or control the camera with a ref.'
            vanillaCode={vanillaCode}
            reactCode={reactCode}
            preview={
                <div className='h-115 w-90'>
                    <ReactMinevo3D
                        ref={viewerRef}
                        fov={fov}
                        zoom={zoom}
                        camera={{ keepFraming, minZoom: 0.3, maxZoom: 5 }}
                        controls={{ zoom: true, resetOnDoubleClick: true }}
                        onCameraChange={state => {
                            setZoom(Number(state.zoom.toFixed(3)));
                            setFov(state.fov);
                        }}
                    />
                </div>
            }
            controls={
                <>
                    <label>
                        FOV {Math.round(fov)}°
                        <input
                            type='range'
                            min={10}
                            max={100}
                            value={fov}
                            onChange={event => setFov(Number(event.target.value))}
                        />
                    </label>
                    <label>
                        Zoom {zoom.toFixed(2)}×
                        <input
                            type='range'
                            min={0.3}
                            max={5}
                            step={0.05}
                            value={zoom}
                            onChange={event => setZoom(Number(event.target.value))}
                        />
                    </label>
                    <label className='flex items-center gap-2'>
                        <input
                            className='m-0 flex-none'
                            type='checkbox'
                            checked={keepFraming}
                            onChange={event => setKeepFraming(event.target.checked)}
                        />
                        Keep the same size when FOV changes
                    </label>
                    <button onClick={() => viewerRef.current?.zoomIn()}>＋</button>
                    <button onClick={() => viewerRef.current?.zoomOut()}>－</button>
                    <button onClick={() => viewerRef.current?.resetCamera()}>
                        Reset
                    </button>
                </>
            }
        />
    );
}
