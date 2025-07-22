const Index = () => {
  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-primary">Textile Business Suite</h1>
          <p className="text-xl text-muted-foreground">
            Comprehensive fabric supply and delivery management system
          </p>
          <div className="mt-8 p-6 bg-card border rounded-lg shadow-sm">
            <h2 className="text-2xl font-semibold mb-4">System Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="space-y-2">
                <h3 className="font-medium text-primary">Supplier Management</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Fabric procurement tracking</li>
                  <li>• Supplier bill generation</li>
                  <li>• Return note management</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-primary">Customer Management</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Customer invoicing</li>
                  <li>• Outstanding balance tracking</li>
                  <li>• Payment processing</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-primary">Delivery Management</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Good receiver notes</li>
                  <li>• Delivery tracking</li>
                  <li>• Return processing</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-primary">Financial Dashboard</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Outstanding amounts summary</li>
                  <li>• Automated balance calculations</li>
                  <li>• Financial reporting</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-8 p-4 bg-secondary/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Ready to build your comprehensive fabric business management system. 
              Connect to Supabase to enable full functionality.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
