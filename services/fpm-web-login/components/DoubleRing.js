import React from "react";
import styled, { createGlobalStyle } from "styled-components";
import { hex2rgba } from "../utils/css";

const DoubleRingGlobalStyle = createGlobalStyle`
@keyframes lds-dual-ring {
  0% {
    -webkit-transform: rotate(0);
    transform: rotate(0);
  }
  100% {
    -webkit-transform: rotate(360deg);
    transform: rotate(360deg);
  }
}
@-webkit-keyframes lds-dual-ring {
  0% {
    -webkit-transform: rotate(0);
    transform: rotate(0);
  }
  100% {
    -webkit-transform: rotate(360deg);
    transform: rotate(360deg);
  }
}
@keyframes lds-dual-ring_reverse {
  0% {
    -webkit-transform: rotate(0);
    transform: rotate(0);
  }
  100% {
    -webkit-transform: rotate(-360deg);
    transform: rotate(-360deg);
  }
}
@-webkit-keyframes lds-dual-ring_reverse {
  0% {
    -webkit-transform: rotate(0);
    transform: rotate(0);
  }
  100% {
    -webkit-transform: rotate(-360deg);
    transform: rotate(-360deg);
  }
}`;

export default ({ size = 32, border = 4, space = 2, color = "#ffffff" }) => {
  const DualRing = styled.div`
    position: relative;
    width: ${size}px;
    height: ${size}px;
  `;

  const DualRingOne = styled.div`
    position: absolute;
    width: ${size - 2 * border}px;
    height: ${size - 2 * border}px;
    top: 0;
    left: 0;
    border-radius: 50%;
    border: ${border}px solid #000;
    border-color: ${hex2rgba(color, 0.85)} transparent ${hex2rgba(color, 0.85)}
      transparent;
    -webkit-animation: lds-dual-ring 1.5s linear infinite;
    animation: lds-dual-ring 1.5s linear infinite;
  `;

  (size + 2 * border) / 4;
  // 108
  const DualRingTwo = styled(DualRingOne)`
    width: ${size - 4 * border - 2 * space}px;
    height: ${size - 4 * border - 2 * space}px;
    top: ${border + space}px;
    left: ${border + space}px;
    border-color: ${hex2rgba(color, 0.5)} transparent ${hex2rgba(color, 0.5)}
      transparent;
    -webkit-animation: lds-dual-ring_reverse 1.5s linear infinite;
    animation: lds-dual-ring_reverse 1.5s linear infinite;
  `;
  return (
    <DualRing>
      <DualRingOne />
      <DualRingTwo />
      <DoubleRingGlobalStyle />
    </DualRing>
  );
};
