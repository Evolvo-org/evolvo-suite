/// <reference types="cypress" />

describe('Homepage', () => {
  it('renders the Next.js homepage', () => {
    cy.visit('/');

    cy.title().should('eq', 'Create Next App');
    cy.contains('Get started by editing').should('be.visible');
    cy.contains('button', 'Open alert').should('be.visible');

    cy.contains('a', 'Deploy now')
      .should('be.visible')
      .and('have.attr', 'href')
      .and('include', 'vercel.com');

    cy.contains('a', 'Read our docs')
      .should('be.visible')
      .and('have.attr', 'href')
      .and('include', 'turborepo.dev/docs');
  });
});
