describe('demobank home page', function() {
    it('should have a title of DemoBank', function() {
        browser.url('http://localhost:8181/home');
        browser.getTitle().should.be.equal('DemoBank');
    });
});
