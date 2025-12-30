import React, { useRef, useState, useEffect } from 'react';
import './AudioPlayer.css';

interface AudioPlayerProps {
    src: string;
    duration?: number;
    onTimeUpdate?: (currentTime: number) => void;
}

const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, duration, onTimeUpdate }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(duration || 0);
    const [playbackRate, setPlaybackRate] = useState(1);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
            onTimeUpdate?.(audio.currentTime);
        };

        const handleLoadedMetadata = () => {
            setAudioDuration(audio.duration);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [onTimeUpdate]);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current;
        if (!audio) return;

        const newTime = parseFloat(e.target.value);
        audio.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const handleSpeedChange = () => {
        const audio = audioRef.current;
        if (!audio) return;

        const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
        const currentIndex = speeds.indexOf(playbackRate);
        const nextIndex = (currentIndex + 1) % speeds.length;
        const newRate = speeds[nextIndex];

        audio.playbackRate = newRate;
        setPlaybackRate(newRate);
    };

    const skipForward = () => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = Math.min(audio.currentTime + 5, audioDuration);
    };

    const skipBackward = () => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = Math.max(audio.currentTime - 5, 0);
    };

    const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

    return (
        <div className="audio-player">
            <audio ref={audioRef} src={src} preload="metadata" />

            <div className="audio-controls">
                <button
                    className="control-btn skip-btn"
                    onClick={skipBackward}
                    title="后退5秒"
                >
                    ⏪
                </button>

                <button
                    className="control-btn play-btn"
                    onClick={togglePlay}
                    title={isPlaying ? '暂停' : '播放'}
                >
                    {isPlaying ? '⏸️' : '▶️'}
                </button>

                <button
                    className="control-btn skip-btn"
                    onClick={skipForward}
                    title="快进5秒"
                >
                    ⏩
                </button>
            </div>

            <div className="audio-progress">
                <span className="time-display">{formatTime(currentTime)}</span>
                <div className="progress-bar-container">
                    <input
                        type="range"
                        min="0"
                        max={audioDuration || 100}
                        value={currentTime}
                        onChange={handleSeek}
                        className="progress-slider"
                        style={{ '--progress': `${progress}%` } as React.CSSProperties}
                    />
                </div>
                <span className="time-display">{formatTime(audioDuration)}</span>
            </div>

            <button
                className="speed-btn"
                onClick={handleSpeedChange}
                title="播放速度"
            >
                {playbackRate}x
            </button>
        </div>
    );
};

export default AudioPlayer;
