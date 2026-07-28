<!-- Email input -->
<input type="email" id="loginEmail" placeholder=" " required>

<!-- Password input -->
<input type="password" id="loginPassword" placeholder=" " required>

<!-- Remember me checkbox -->
<input type="checkbox" id="rememberMe">

<!-- Login button -->
<button type="submit" class="btn btn-primary btn-full" id="loginBtn">
    <span class="btn-content">
        <span class="btn-text">Sign In</span>
        <i class="fas fa-arrow-right btn-icon"></i>
    </span>
    <span class="btn-loading" style="display:none;">
        <i class="fas fa-spinner fa-spin"></i> Signing in...
    </span>
</button>

<!-- Toast -->
<div id="toast" class="toast"></div>
