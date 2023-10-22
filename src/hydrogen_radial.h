#ifdef __cplusplus
extern "C" {
#endif
void init_pot(float zeta, int mesh, float *r, float *v_pot);
float solve_sheq(int n, int l, float zeta, int mesh, 
            float dx, float *r, float *sqr,
            float *r2, float *v_pot, float *y);
void do_mesh(float zeta, float xmin, float dx, float rmax, float* r);
int user_input(float zeta, int n, int l, float* r);
void solve_radial(int n, int l, float zeta);
#ifdef __cplusplus
}
#endif