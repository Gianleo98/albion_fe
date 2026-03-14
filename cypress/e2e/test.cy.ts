describe('Albion App', () => {
  it('loads the home page', () => {
    cy.visit('/');
    cy.contains('Albion');
  });
});
