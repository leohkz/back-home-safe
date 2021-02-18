import React, { useCallback, useEffect, useRef } from "react";
import jsQR, { QRCode } from "jsqr";
import styled from "styled-components";

type Props = {
  onDecode: (code: QRCode) => void;
};

// ref: https://ithelp.ithome.com.tw/articles/10239258
const OldGetUserMedia = () =>
  navigator.getUserMedia ||
  (navigator as any).webkitGetUserMedia ||
  (navigator as any).mozGetUserMedia ||
  (navigator as any).msGetUserMedia;

// Initializes media stream.
const getUserMedia = (constraints: MediaStreamConstraints) => {
  if ("mediaDevices" in navigator) {
    return navigator.mediaDevices.getUserMedia(constraints);
  }
  // 相容處理，依照新接口
  (navigator as any).mediaDevices = {};

  (navigator as any).mediaDevices.getUserMedia = (
    constraints: MediaStreamConstraints
  ) => {
    const getUserMedia = OldGetUserMedia();

    // 不支援的情況下
    if (!getUserMedia) {
      return Promise.reject(
        new Error("getUserMedia is not implemented in this browser")
      );
    }

    // 保持跟原先api一樣故將其封裝成promise
    return new Promise(function (resolve, reject) {
      getUserMedia.call(navigator, constraints, resolve, reject);
    });
  };

  return (navigator as any).mediaDevices.getUserMedia(constraints);
};

export const QRCodeReader = ({ onDecode }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const tick = useCallback(() => {
    const canvasElement = canvasRef.current;
    const videoElement = videoRef.current;

    if (
      canvasElement &&
      videoElement &&
      videoElement.readyState === videoElement.HAVE_ENOUGH_DATA
    ) {
      const canvas = canvasElement.getContext("2d");
      if (!canvas) return;

      canvasElement.height = videoElement.videoHeight;
      canvasElement.width = videoElement.videoWidth;
      canvas.drawImage(
        videoElement,
        0,
        0,
        canvasElement.width,
        canvasElement.height
      );

      const imageData = canvas.getImageData(
        0,
        0,
        canvasElement.width,
        canvasElement.height
      );
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code) {
        onDecode(code);
      }
    }
    requestAnimationFrame(tick);
  }, [videoRef, canvasRef, onDecode]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    getUserMedia({ video: { facingMode: "environment" } }).then(
      (stream: MediaStream) => {
        if (!videoElement) return;
        videoElement.srcObject = stream;
        videoElement.play();
        requestAnimationFrame(tick);
      }
    );
  }, [tick, videoRef]);

  return (
    <>
      <Video ref={videoRef} playsInline />
      <Canvas ref={canvasRef} />
    </>
  );
};

const Video = styled.video`
  /* Make video to at least 100% wide and tall */
  min-width: 100%;
  min-height: 100%;

  /* Setting width & height to auto prevents the browser from stretching or squishing the video */
  width: auto;
  height: auto;

  /* Center the video */
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
`;

const Canvas = styled.canvas`
  display: none;
`;
