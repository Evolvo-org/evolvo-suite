/// <reference types="cypress" />

describe('Homepage', () => {
  it('renders the projects shell', () => {
    cy.visit('/projects');

    cy.title().should('eq', 'Evolvo v2');
    cy.contains('Projects').should('be.visible');
    cy.contains('a', 'Create project').should('be.visible');
  });
});
