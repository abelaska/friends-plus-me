import styled from 'styled-components';

export const SectionTop = styled.section`
  width: 100%;
  min-height: 750px;
  height: auto;
  position: relative;
  background: #fff;
  overflow: hidden;

  @media (max-width: 767px) {
    min-height: 1100px;
  }

  &:before {
    content: '';
    position: absolute;
    left: -2rem;
    top: -10rem;
    width: calc(100% + 4rem);
    height: calc(100% + 5rem);

    background: -webkit-linear-gradient(-410deg, #0f3966 10%, #54b8df 90%);
    background: linear-gradient(140deg, #0f3966 10%, #54b8df 90%);

    -webkit-transform: rotate(3deg);
    transform: rotate(3deg);
  }
`;

export const SectionTopInset = styled.div`
  display: block;
  max-width: 1300px;
  margin-right: auto;
  margin-left: auto;
  padding: 0 1.5625rem;
  position: relative;
  z-index: 100;
`;
