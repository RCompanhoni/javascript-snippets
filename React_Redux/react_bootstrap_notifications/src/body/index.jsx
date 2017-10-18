import React from 'react';
import CSSModules from 'react-css-modules';
import { Button, Grid, Jumbotron, Row, Col } from 'react-bootstrap/lib/';
import LearnMore from './learn_more';
import styles from './styles.scss';

const Body = () => (
  <div>
    <Jumbotron>
      <Grid>
        <h1>Hello, world!</h1>
        <p>This is a template for a simple marketing or informational website. It includes a
           large callout called a jumbotron and three supporting pieces of content. Use it as
           a starting point to create something more unique.
        </p>
        <LearnMore />
      </Grid>
    </Jumbotron>

    <Grid>
      <Row>
        <Col md={4}>
          <h2>Heading</h2>
          <p>Adipisicing ratione incidunt eaque expedita rerum porro inventore. Nihil sit
             ipsam iure officiis sit eos at quibusdam natus dignissimos natus dolore! Vel doloremque
             ipsa alias nihil harum laborum necessitatibus rerum?
          </p>
          <p><Button>View details »</Button></p>
        </Col>

        <Col md={4}>
          <h2>Heading</h2>
          <p>Sit quia nemo quis enim provident porro eaque accusamus tenetur
             provident aliquid commodi? Velit nesciunt maiores obcaecati totam praesentium
             sint vitae exercitationem quaerat maxime iusto et! Consequatur
             aspernatur sit impedit.
          </p>
          <p><Button>View details »</Button></p>
        </Col>

        <Col md={4}>
          <h2>Heading</h2>
          <p>Dolor aliquid dolores perferendis repellendus cum! Quam maiores
             blanditiis cupiditate voluptatibus voluptas aliquid nisi placeat tempora.
             Rem debitis accusamus pariatur officia corrupti. Architecto
             fuga reiciendis quos rem hic? Suscipit dignissimos.
          </p>
          <p><Button>View details »</Button></p>
        </Col>
      </Row>
    </Grid>
  </div>
);

export default CSSModules(Body, styles);
