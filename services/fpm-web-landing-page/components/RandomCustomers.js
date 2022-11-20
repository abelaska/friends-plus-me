import React from "react";
import { Col, Row } from "react-styled-flexboxgrid";
import Endorsement from "./Endorsement";
import { randomCustomers } from "./Customers";

class RandomCustomers extends React.Component {
  render() {
    return (
      <Row start="xs" center="xs">
        {randomCustomers(3).map((c) => (
          <Col key={c.name} xs={12} sm={4} style={{ padding: "10px" }}>
            <Endorsement customer={c} />
          </Col>
        ))}
      </Row>
    );
  }
}

export default RandomCustomers;
